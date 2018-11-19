/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Web Сервис хранения мелиа-файлов.
 * \author Величко Ростислав
 * \date   11.12.2015
 */

/// Пример запуска: ./web-media-loader --docroot . --http-address 0.0.0.0 --http-port=8086
/// Пример запроса: localhost:8086?path=test_media
/// Пример удаления: localhost:8086/rest/delete_media?path=test_media&media_file.png


#include <stdexcept>
#include <string>
#include <algorithm>
#include <set>

#include <boost/filesystem.hpp>
#include <boost/range/iterator_range.hpp>
#include <boost/algorithm/string.hpp>

#include <Wt/WContainerWidget>
#include <Wt/WOverlayLoadingIndicator>
#include <Wt/WApplication>
#include <Wt/WProgressBar>
#include <Wt/WDialog>
#include <Wt/WString>
#include <Wt/WVBoxLayout>
#include <Wt/WHBoxLayout>
#include <Wt/WFileUpload>
#include <Wt/WText>
#include <Wt/WPushButton>
#include <Wt/WLabel>
#include <Wt/WEnvironment>
#include <Wt/WServer>
#include <Wt/WResource>
#include <Wt/WFileResource>
#include <Wt/WImage>
#include <Wt/WAnchor>
#include <Wt/Http/Response>

#include "Log.hpp"
#include "Singleton.hpp"


namespace arobot {
namespace tools {

namespace bfs = boost::filesystem;


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
        _types.insert(".png");
        _types.insert(".jpg");
        _types.insert(".avi");
        _types.insert(".mp4");
        _types.insert(".mp3");
        _types.insert(".ogg");
    }

    std::vector<bfs::path> update(const bfs::path &media_path) {
        // Получить список ММ файлов
        bfs::path abs = bfs::absolute(bfs::path("."));
        std::vector<bfs::path> files;
        if(bfs::is_directory(abs / media_path)) {
            for(auto& entry : boost::make_iterator_range(bfs::directory_iterator(abs / media_path), {})) {
                if (bfs::is_regular_file(entry.path()) and _types.find(entry.path().extension().string()) not_eq _types.end()) {
                    files.push_back(entry.path());
                }
            }
        }
        // Обновить json c медийными файлами
        std::ofstream ofs;
        ofs.open((abs / media_path / "media.json").string().c_str());
        ofs << mmListToJson(files);
        ofs.close();
        LOG(DEBUG) << "Update: \"" << (abs / media_path / "media.json").string() << "\"";
        return files;
    }
};


class MediaLoader
    : public Wt::WContainerWidget {
    Wt::WContainerWidget *_file_upload_contaner;
    Wt::WVBoxLayout *_btns_vbox;
    bfs::path _media_path;
    FileUpdater _file_updater;

    void createFileUpload(Wt::WVBoxLayout *vbox) {
        _file_upload_contaner = new Wt::WContainerWidget();
        vbox->addWidget(_file_upload_contaner);

        Wt::WFileUpload *file_upload = new Wt::WFileUpload(_file_upload_contaner);
        file_upload->setMultiple(false);
        file_upload->setId("media_uploader");
        file_upload->setWidth(Wt::WLength(180));
        file_upload->setHeight(Wt::WLength(34));
        file_upload->setAttributeValue("onsubmit",
                                       //Wt::WString("window.parent.document.getElementById('uploaded-file').onclick();"));
                                       Wt::WString("alert(123);"));

        file_upload->fileTooLarge().connect(std::bind([=]() {
            LOG(WARNING) << "File \"" << file_upload->clientFileName().toUTF8() << "\" is too large\n";
        }));

        file_upload->changed().connect(std::bind([=]() {
            file_upload->upload();
            LOG(DEBUG) << "Change File \"" << file_upload->spoolFileName() << "\"; \""
                       << file_upload->clientFileName().toUTF8() << "\" is upload\n";
        }));

        file_upload->uploaded().connect(std::bind([=]() {
            std::string file_name = file_upload->clientFileName().toUTF8();
            bfs::path file_path(bfs::absolute(bfs::path(".")) / _media_path / bfs::path(file_name));
            LOG(DEBUG) << "Upload File \"" << file_upload->spoolFileName() << "\"; \"" << file_name << "\" is upload\n";
            if (bfs::exists(file_path)) {
                bfs::remove(file_path);
            }
            bfs::path to_path = bfs::path(file_upload->spoolFileName());
            bfs::permissions(to_path, bfs::all_all);
            bfs::copy(to_path, file_path);
            bfs::remove(bfs::path(file_upload->spoolFileName()));

            //// Виджет с загрузчиком файла
            //removeFileUpload(vbox);
            //createFileUpload(vbox);
        }));

        //Wt::WPushButton *upload_button = new Wt::WPushButton("Send", _file_upload_contaner);
        //upload_button->setMargin(10, Wt::Left | Wt::Right);
        //
        //upload_button->clicked().connect(std::bind([=] () {
        //    file_upload->stealSpooledFile();
        //}));

        // Обновить информацию о файлах
        _file_updater.update(_media_path);
    }

    void removeFileUpload(Wt::WVBoxLayout *vbox) {
        if(_file_upload_contaner) {
            vbox->removeWidget(_file_upload_contaner);
            delete _file_upload_contaner;
            _file_upload_contaner = 0;
        }
    }

public:
    MediaLoader(const bfs::path &media_path)
        : _file_upload_contaner(nullptr)
        , _btns_vbox(nullptr)
        , _media_path(media_path) {
        // Добавление вертикального контейнера
        Wt::WVBoxLayout *vbox = new Wt::WVBoxLayout(this);

        // Добавление загрузчика текстового файла
        createFileUpload(vbox);
    }
};


class MediaDeleter
    : public Wt::WResource {
    FileUpdater _file_updater;

public:
    MediaDeleter(Wt::WObject *parent = 0)
        : Wt::WResource(parent)
    {}

    virtual ~MediaDeleter() {
        beingDeleted();
    }

    void handleRequest(const Wt::Http::Request &request, Wt::Http::Response &response) {
        std::string result = "{\"result\":\"false\"}";
        Wt::Http::ParameterMap param_map = request.getParameterMap();
        LOG(DEBUG) << "REQ: param_map size=" << param_map.size();
        bool is_complete = false;
        if (param_map.size() == 2) {
            Wt::Http::ParameterMap::iterator path_iter = param_map.find("path");
            Wt::Http::ParameterMap::iterator files_iter = param_map.find("files");
            if (path_iter not_eq param_map.end() and files_iter not_eq param_map.end()) {
                bfs::path file_path = bfs::absolute(bfs::path(".")) / path_iter->second[0];
                std::vector<std::string> files;
                boost::split(files, files_iter->second[0], boost::is_any_of(","));
                for(const auto &file : files) {
                    bfs::path fpath = file_path / file;
                    LOG(DEBUG) << "\"" << fpath.string() << "\"";
                    if (bfs::exists(fpath)) {
                        bfs::remove(fpath);
                        LOG(DEBUG) << "Remove File: \"" << fpath.string() << "\"";
                        is_complete = true;
                    }
                }
                if (is_complete) {
                    _file_updater.update(bfs::path(path_iter->second[0]).parent_path());
                    result = "{\"result\":\"true\"}";
                }
            }
        }
        response.addHeader("Access-Control-Allow-Origin", "*");
        response.addHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        response.addHeader("Access-Control-Allow-Headers", "Content-Type");
        response.out() << result;
    }
};


class WebApplication
    : public Wt::WApplication {
public:
    WebApplication(const Wt::WEnvironment &env)
        : Wt::WApplication(env) {
        bfs::path abs_path = bfs::absolute(bfs::path(this->docRoot()));

        this->setTitle(Wt::WString::tr("Title"));

        Wt::WApplication *app = Wt::WApplication::instance();
        app->setLoadingIndicator(new Wt::WOverlayLoadingIndicator());
        app->styleSheet().addRule("body", "margin: 0px");
        app->styleSheet().addRule("#inoake0ug", "width:180px;height:34px;opacity:0;");
        //app->styleSheet().addRule("#ifmedia_uploader",
        //                          "width:118;background-color:#fff;border-radius:5px;");
        //app->styleSheet().addRule("#inmedia_uploader",
        //                          "background-color:#fff;border-radius:5px;");
        //app->styleSheet().addRule("#media_uploader",
        //                          "background-color:#fff;border-radius:5px;");

        // Веб обработчик
        Wt::WContainerWidget *container = new Wt::WContainerWidget(this->root());
        bfs::path media_path = "media";
        if (not env.getParameterValues("path").empty()) {
            media_path = bfs::path(env.getParameterValues("path")[0]);
        }
        LOG(INFO) << "MEDIA PATH: " << media_path;
        container->addWidget(new MediaLoader(media_path));
    }
};


//! \ brief Функция генерации web приложения
class AppCreator {
public:
    Wt::WApplication* operator() (const Wt::WEnvironment& env) {
        return new WebApplication(env);
    }
};
} // tools
} // arobot


int CustomRun(int argc, char *argv[]) {
    try {
        Wt::WServer server(argv[0]);
        server.setServerConfiguration(argc, argv);
        server.addResource(new arobot::tools::MediaDeleter(), "/rest/delete_media");
        server.addEntryPoint(Wt::Application, arobot::tools::AppCreator());

        if (server.start()) {
            int sig = Wt::WServer::waitForShutdown(argv[0]);
            std::cerr << "Shutdown (signal = " << sig << ")" << std::endl;
            server.stop();
        }
    } catch(Wt::WServer::Exception& e) {
        LOG(ERROR) << e.what();
        return 1;
    } catch(std::exception& e) {
        LOG(ERROR) << "exception: " << e.what();
        return 1;
    } catch(...) {
        LOG(FATAL) << "Undefined exeption.";
    }
    return 0;
}


int main(int argc, char **argv) {
    LOG_TO_STDOUT;
    // Запуск WEB приложения
    return CustomRun(argc, argv);
}
