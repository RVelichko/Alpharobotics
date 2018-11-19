/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Web Сервис организации загрузки .
 * \author Величко Ростислав
 * \date   18.06.2016
 */

#include <iostream>
#include <set>
#include <map>
#include <vector>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <functional>
#include <cstdlib>
#include <ctime>
#include <iomanip>

#include <boost/program_options.hpp>
#include <boost/filesystem.hpp>

#include <json/json.h>

#include "Log.hpp"
#include "Timer.hpp"
#include "WebSocketServer.hpp"


namespace bfs = boost::filesystem;

namespace arobot {
namespace tools {

/**
 *  Класс объновляющий json список медийных файлов в хранимой директории
 */
class FileUpdater {
    std::set<std::string> _types;

    std::string mmListToJson(const std::vector<bfs::path> &files) {
        std::stringstream ss;
        ss << "[";
        for(size_t i = 0; i < files.size(); ++i) {
            ss << "\"" << files[i].filename().string() << "\"";
            if (i + 1 < files.size()) {
                ss << ",";
            }
        }
        ss << "]";
        return ss.str();
    }

public:
    FileUpdater() {
        _types.insert(".png"); _types.insert(".PNG");
        _types.insert(".jpg"); _types.insert(".JPG");
        _types.insert(".avi"); _types.insert(".AVI");
        _types.insert(".mp4"); _types.insert(".MP4");
        _types.insert(".mp3"); _types.insert(".MP3");
        _types.insert(".ogg"); _types.insert(".OGG");
    }

    std::vector<bfs::path> update(const bfs::path &media_path) {
        /// Получить список ММ файлов
        std::vector<bfs::path> files;
        if (bfs::is_directory(media_path)) {
            for (auto& entry : boost::make_iterator_range(bfs::directory_iterator(media_path), {})) {
                if (bfs::is_regular_file(entry.path()) and _types.find(entry.path().extension().string()) not_eq _types.end()) {
                    files.push_back(entry.path());
                }
            }
        }
        /// Обновить json c медийными файлами
        std::ofstream ofs;
        ofs.open((media_path / "media.json").string().c_str());
        ofs << mmListToJson(files);
        ofs.close();
        LOG(DEBUG) << "Update: \"" << (media_path / "media.json").string() << "\"";
        return files;
    }
};


typedef std::shared_ptr<FileUpdater> PFileUpdater;
typedef webserver::Worker Worker;
typedef webserver::ConnectionValue ConnectionValue;
typedef webserver::ConnectionValuesIter ConnectionValuesIter;
typedef webserver::PConnectionValue PConnectionValue;


/**
 *  Класс обработки подключений для загрузки файлов с клиента на сервер
 */
class FileUploaderWorker
    : public Worker {
    struct ConnectionPath
        : public ConnectionValue {
        size_t _count;
        size_t _size;
        std::string _path;
        std::string _buf;
    };

    typedef std::shared_ptr<ConnectionPath> PConnectionPath;

    PFileUpdater _file_updater;

    virtual PConnectionValue firstMessage(size_t connection_id, const std::string &msg) {
        PConnectionPath con_path;
        try {
            Json::Value json;
            Json::Reader reader;
            if (reader.parse(msg, json)) {
                if (not json["size"].isNull() and not json["path"].isNull()) {
                    bfs::path file_path = bfs::absolute(bfs::path(".")) / json["path"].asString();
                    con_path = std::make_shared<ConnectionPath>();
                    con_path->_count = 0;
                    con_path->_size = json["size"].asUInt();
                    con_path->_path = file_path.string();
                    LOG(DEBUG) << connection_id << ": < New image file: \"" << msg << "\"";
                } else {
                    _err_func(connection_id, "Can`t find json parameters name or size.");
                }
            }
        } catch (const std::exception &e) {
            _err_func(connection_id, "Can`t parse input json message '" + msg + "'; " + e.what());
        }
        return con_path;
    }

    virtual bool lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
        ConnectionPath *con_path = dynamic_cast<ConnectionPath*>(iter->second.get());
        //LOG(DEBUG) << con_path->_connection_id;
        /// Допринять буффер данных
        if (con_path->_buf.size() + msg.size() <= con_path->_size) {
            con_path->_buf.insert(con_path->_buf.end(), msg.begin(), msg.end());
            std::stringstream ss_json;
            ss_json << "{\"recvd\":" << con_path->_buf.size() << "}";
            _msg_func(con_path->_connection_id, ss_json.str(), WS_STRING_MESSAGE);
            LOG(DEBUG) << con_path->_connection_id << ": recvd: " << ++con_path->_count << ": "
                       << con_path->_buf.size() << " - " << msg.size() << " = "
                       << con_path->_size - con_path->_buf.size();
        }
        /// Обработать принятый файл
        if (con_path->_buf.size() == con_path->_size) {
            /// Сохранить данные файла на сервере по полученному ранее пути
            try {
                std::ofstream ofs(con_path->_path.c_str());
                ofs.write(con_path->_buf.c_str(), con_path->_buf.size());
                /// Обновить список файлов
                _file_updater->update(bfs::path(con_path->_path).parent_path());
                /// Отправить json с флагом успешного сохранения
                std::stringstream resp_ss;
                resp_ss << "{\"file\":\"" << con_path->_path << "\",\"status\":\"save\"}";
                _msg_func(con_path->_connection_id, resp_ss.str(), WS_STRING_MESSAGE);
                LOG(DEBUG) << con_path->_connection_id << ": \"" << resp_ss.str() << "\"";
            } catch (const std::exception& e) {
                /// Отправить json с сообщением об ошибке
                _err_func(con_path->_connection_id, "File: " + con_path->_path + "; w: " + e.what());
                LOG(ERROR) << con_path->_connection_id << ": File \"" << con_path->_path << "\" not Save. " << e.what();
            }
            /// Файл полностью обработан - необходимо завершить последовательность сообщений
            return true;
        }
        return false;
    }

public:
    explicit FileUploaderWorker(std::mutex &mutex, const PFileUpdater &file_updater)
        : Worker(mutex)
        , _file_updater(file_updater)
    {}

    virtual ~FileUploaderWorker()
    {}
};


class FileDeleterWorker
    : public Worker {
    PFileUpdater _file_updater;

public:
    explicit FileDeleterWorker(std::mutex &mutex, const PFileUpdater &file_updater)
        : Worker(mutex)
        , _file_updater(file_updater)
    {}

    virtual ~FileDeleterWorker()
    {}

    virtual void onMessage(size_t connection_id, const std::string &msg) {
        LOG(DEBUG) << "try delete < \"" << msg << "\"";
        try {
            Json::Value json;
            Json::Reader reader;
            bool status = false;
            if (reader.parse(msg, json)) {
                if (not json["paths"].isNull()) {
                    const Json::Value paths_json = json["paths"];
                    for (int index = 0; static_cast<size_t>(index) < paths_json.size(); ++index) {
                        const Json::Value path_json = paths_json[index];
                        if (not path_json["path"].isNull() and path_json["path"].isString()) {
                            bfs::path file_path = bfs::absolute(".") / path_json["path"].asString();
                            std::lock_guard<std::mutex> lock(_mutex);
                            if (bfs::exists(file_path)) {
                                bfs::remove(file_path);
                                status = true;
                                LOG(DEBUG) << "deleted: \"" << file_path.string() << "\"";
                                _file_updater->update(file_path.parent_path());
                            }
                        }
                    }
                } else {
                    LOG(INFO) << connection_id << " - \"path\" is not found.";
                    _err_func(connection_id, "Can`t find values");
                }
            }
            if (status) {
                /// Обновить список файлов
                _msg_func(connection_id, "{\"status\":\"ok\"}", WS_STRING_MESSAGE);
            }
        } catch (const std::exception &e) {
            _err_func(connection_id, "Can`t parse input json message '" + msg + "'; " + e.what());
        }
    }
};


typedef std::shared_ptr<FileUploaderWorker> PFileUploaderWorker;
typedef std::shared_ptr<FileDeleterWorker> PFileDeleterWorker;
typedef webserver::WebSocketServer WebSocketServer;
typedef std::shared_ptr<WebSocketServer> PWebSocketServer;


/**
 *  Класс обработки подключений для загрузки файлов с клиента на сервер
 */
class FileServer {
    std::mutex _mutex; ///< Синхронизация доступа к массиву каналов

    PFileUpdater _file_updater;
    PFileUploaderWorker _uploader_worker; ///< Точка подключения для загрузки
    PFileDeleterWorker _deleter_worker;    ///< Точка подключения для удаления

public:
    /**
     * Сервис обработки покдлючений для загрузки файлов
     *
     * \param port   Порт для подключения
     * \param epoint Рест адрес подключения
     * \param srvcrt SSL сертификат
     * \param srvkey SSL ключ!
     */
    FileServer(unsigned short port, const std::string &save_point, const std::string &del_point,
               const std::string &srvcrt, const std::string &srvkey)
            : _file_updater(std::make_shared<FileUpdater>())
            ,  _uploader_worker(std::make_shared<FileUploaderWorker>(_mutex, _file_updater))
            ,  _deleter_worker(std::make_shared<FileDeleterWorker>(_mutex, _file_updater)) {
        LOG(INFO) << "Start: \"" << save_point << "\", \"" << del_point << "\"";
        /// Инициализация web сервера
        PWebSocketServer server;
        if (not srvcrt.empty() and not srvkey.empty()) {
            server = std::make_shared<WebSocketServer>(port, srvcrt, srvkey);
        } else {
            server = std::make_shared<WebSocketServer>(port);
        }
        server->addEndpoint(save_point, _uploader_worker);
        server->addEndpoint(del_point, _deleter_worker);
        /// Запуск сервиса
        server->start();
    }
};
} // tools
} // arobot


#define DEFAULT_PORT 20003

namespace bpo = boost::program_options;

int main(int argc, char **argv) {
    LOG_TO_STDOUT;
    try {
        int port;
        std::string save_point;
        std::string del_point;
        std::string srvcrt;
        std::string srvkey;
        bpo::options_description desc("Сервис загрузки файла клиента на сервер.");
        desc.add_options()
          ("help,h", "Показать список параметров")
          ("port,p", bpo::value<int>(&port)->default_value(DEFAULT_PORT), "Порт для подключения")
          ("save_point,s", bpo::value<std::string>(&save_point)->default_value("^/rest/fupload/?$"), "Рест адрес сохранения")
          ("del_point,d", bpo::value<std::string>(&del_point)->default_value("^/rest/fdelete/?$"), "Рест адрес удаления")
          ("srvcrt,c", bpo::value<std::string>(&srvcrt), "SSL сертификат")
          ("srvkey,k", bpo::value<std::string>(&srvkey), "SSL ключ")
          ; //NOLINT
        bpo::variables_map vm;
        bpo::store(bpo::parse_command_line(argc, argv, desc), vm);
        bpo::notify(vm);

        if (vm.count("help")) {
            std::cout << desc << "\n";
            return 0;
        }
        arobot::tools::FileServer(port, save_point, del_point, srvcrt, srvkey);
    } catch (std::exception &e) {
        LOG(ERROR) << e.what() << "\n";
    }
    return 0;
}
