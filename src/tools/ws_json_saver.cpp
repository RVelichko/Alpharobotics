/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Web Сервис сохранения json конфигов.
 * \author Величко Ростислав
 * \date   31.05.2016
 */

#include <iostream>
#include <set>
#include <map>
#include <vector>
#include <functional>
#include <cstdlib>
#include <ctime>
#include <memory>
#include <mutex>

#include <boost/program_options.hpp>

#include <json/json.h>

#include "Log.hpp"
#include "Timer.hpp"
#include "WebSocketServer.hpp"


namespace arobot {
namespace tools {

typedef webserver::Worker Worker;


/**
 *  Класс обработки подключений и объмена сообщениями роботов с операторами
 */
class JsonSaverWorker
    : public Worker {
    virtual void onMessage(size_t connection_id, const std::string &msg) {
        LOG(DEBUG) << "msg < \"" << msg << "\"";
        try {
            Json::Value json;
            Json::Reader reader;
            if (reader.parse(msg, json)) {
                if (not json["path"].isNull() and not json["json"].isNull()) {
                    std::string path = json["path"].asString();
                    std::string jstr = json["json"].asString();
                    {
                        std::lock_guard<std::mutex> lock(_mutex);
                        std::ofstream ofs(path);
                        ofs << jstr << std::flush;
                        ofs.close();
                    }
                    LOG(DEBUG) << "\"" << jstr << "\"";
                    _msg_func(connection_id, "{\"status\":\"ok\"}", WS_STRING_MESSAGE);
                } else {
                    LOG(INFO) << connection_id << " - \"path\" or \"json\" is not found.";
                    _err_func(connection_id, "Can`t find values");
                }
            }
        } catch (const std::exception &e) {
            _err_func(connection_id, "Can`t parse input json message '" + msg + "'; " + e.what());
        }
    }

public:
    explicit JsonSaverWorker(std::mutex &mutex)
        : Worker(mutex)
    {}

    virtual ~JsonSaverWorker()
    {}
};
} // tools
} // arobot


#define DEFAULT_PORT 20000

typedef arobot::webserver::WebSocketServer WebSocketServer;
typedef std::shared_ptr<WebSocketServer> PWebSocketServer;
typedef arobot::tools::JsonSaverWorker JsonSaverWorker;

namespace bpo = boost::program_options;


int main(int argc, char **argv) {
    LOG_TO_STDOUT;
    try {
        int port;
        std::string srvcrt;
        std::string srvkey;
        std::string rest_point;
        bpo::options_description desc("Сервер организации записи json файлов в указанную директорию относительно директории запуска.");
        desc.add_options()
          ("help,h", "Показать список параметров")
          ("port,p", bpo::value<int>(&port)->default_value(DEFAULT_PORT), "Порт для подключения")
          ("resr_point,r", bpo::value<std::string>(&rest_point)->default_value("^/rest/saver?$"), "Рест адрес подключения для сохранения файлов")
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
        /// Инициализация web сервера
        PWebSocketServer server;
        if (not srvcrt.empty() and not srvkey.empty()) {
            server = std::make_shared<WebSocketServer>(port, srvcrt, srvkey);
        } else {
            server = std::make_shared<WebSocketServer>(port);
        }
        std::mutex mutex; ///< Синхронизация доступа
        server->addEndpoint(rest_point, std::make_shared<JsonSaverWorker>(mutex));
        /// Запуск сервиса
        server->start();
    } catch (std::exception &e) {
        LOG(ERROR) << e.what() << "\n";
    }
    return 0;
}
