/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Web Сервис хранения мелиа-файлов.
 * \author Величко Ростислав
 * \date   11.12.2015
 */

/// Пример запуска: ./web-storadge --docroot . --http-address 0.0.0.0 --http-port=8086
/// Пример запроса: localhost:8086/kiki-001/media

#include <stdexcept>
#include <string>
#include <algorithm>

#include <boost/filesystem.hpp>
#include <boost/range/iterator_range.hpp>

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

class MMHtmlCreator {
    std::string _html;

public:
    MMHtmlCreator(const std::string &name, const std::string &url) {
        std::stringstream ss;
        ss << "<html><head><meta name=\"viewport\"><title>" << name << "</title>"
           << "</head><body style=\"margin: 0px;\">"
           << "<img style=\"border: 1px solid rgb(0, 200, 0); border-radius: 5px; margin: 5px 5px 5px 5px; padding: 3px 3px 3px 3px;\" "
           << "src=\"" << url << "\" max-width=\"90%\" max-height=\"90%\"></body></html>";
        _html = ss.str();
    }

    std::string string() {
        return _html;
    }
};


class FileStoradgePannel
    : public Wt::WContainerWidget {
    Wt::WContainerWidget *_file_upload_contaner;
    Wt::WVBoxLayout *_btns_vbox;
    bfs::path _abs_path;
    bfs::path _media_path;

    void createFileUpload(Wt::WVBoxLayout *vbox) {
        _file_upload_contaner = new Wt::WContainerWidget();
        _file_upload_contaner->setStyleClass("upload_pannel");
        vbox->addWidget(_file_upload_contaner);

        Wt::WFileUpload *file_upload = new Wt::WFileUpload(_file_upload_contaner);
        file_upload->setMultiple(false);
        file_upload->setProgressBar(new Wt::WProgressBar());
        file_upload->setInline(false);

        file_upload->fileTooLarge().connect(std::bind([=]() {
            LOG(WARNING) << "File \"" << file_upload->clientFileName().toUTF8() << "\"is too large\n";
        }));

        file_upload->changed().connect(std::bind([=]() {
            file_upload->upload();
            LOG(DEBUG) << "Change File \"" << file_upload->spoolFileName() << "\"; \""
                       << file_upload->clientFileName().toUTF8() << "\"is upload\n";
        }));

        file_upload->uploaded().connect(std::bind([=]() {
            bfs::path file(_abs_path / _media_path / bfs::path(file_upload->clientFileName().toUTF8()));
            LOG(DEBUG) << "Upload File \"" << file_upload->spoolFileName() << "\"; \""
                       << file_upload->clientFileName().toUTF8() << "\"is upload\n";
            if (bfs::exists(file)) {
                bfs::remove(file);
            }
            bfs::path to_path = bfs::path(file_upload->spoolFileName());
            bfs::permissions(to_path, bfs::all_all);
            bfs::copy(to_path, file);
            bfs::remove(bfs::path(file_upload->spoolFileName()));

            // Генерация HTML
            std::string html_name = file.stem().string();
            MMHtmlCreator mm_http_creator(html_name, file.filename().string());
            LOG(DEBUG) << mm_http_creator.string();
            // Запись HTML на диск
            std::ofstream ofs;
            ofs.open(((_abs_path / _media_path / html_name).string() + ".html").c_str());
            ofs.write(mm_http_creator.string().c_str(), mm_http_creator.string().length());
            ofs.close();

            // Виджет с кнопками удаления
            removeDelButtons(vbox);
            addDelButtons(vbox);
            // Виджет с загрузчиком файла
            removeFileUpload(vbox);
            createFileUpload(vbox);
        }));

        Wt::WPushButton *send_btn = new Wt::WPushButton(Wt::WString::tr("Send"), _file_upload_contaner);
        send_btn->setStyleClass("confirm_button");
        send_btn->clicked().connect(std::bind([=]() {
            if (not file_upload->empty()) {
                // Виджет с кнопками удаления
                removeDelButtons(vbox);
                addDelButtons(vbox);
                // Виджет с загрузчиком файла
                removeFileUpload(vbox);
                createFileUpload(vbox);
            }
        }));
    }

    void removeFileUpload(Wt::WVBoxLayout *vbox) {
        if(_file_upload_contaner) {
            vbox->removeWidget(_file_upload_contaner);
            delete _file_upload_contaner;
            _file_upload_contaner = 0;
        }
    }

    std::vector<bfs::path> updateFiles() {
        // Получить список ММ файлов
        std::vector<bfs::path> files;
        if(bfs::is_directory(_abs_path / _media_path)) {
            for(auto& entry : boost::make_iterator_range(bfs::directory_iterator(_abs_path / _media_path), {})) {
                if (bfs::is_regular_file(entry.path())
                    and entry.path().extension() not_eq ".html"
                    and entry.path().extension() not_eq ".json") {
                    files.push_back(entry.path());
                }
            }
        }
        return files;
    }

    std::string mmListToJson(const std::vector<bfs::path> &files) {
        std::stringstream ss;
        ss << "[";
        for(size_t i = 0; i < files.size(); ++i) {
            ss << "\"" << (_media_path / files[i].filename()).string() << "\"";
            if (i + 1 < files.size()) {
                ss << ",";
            }
        }
        ss << "]";
        return ss.str();
    }

    void confirmDeleteBox(const bfs::path &file, Wt::WVBoxLayout *vbox) {
        Wt::WDialog *dialog = new Wt::WDialog(Wt::WString::tr("ConfirmDelete"));
        dialog->setStyleClass("confirm_dialog");

        Wt::WVBoxLayout *vbox_dlg = new Wt::WVBoxLayout(dialog->footer());
        vbox_dlg->addWidget(new Wt::WLabel(Wt::WString::fromUTF8(file.filename().string())));

        Wt::WHBoxLayout *hbox_dlg = new Wt::WHBoxLayout();
        vbox_dlg->addLayout(hbox_dlg);

        Wt::WPushButton *ok = new Wt::WPushButton(Wt::WString::tr("Ok"), dialog->footer());
        hbox_dlg->addWidget(ok);
        ok->setStyleClass("del_button");
        ok->setDefault(true);
        ok->clicked().connect(std::bind([=] () {
            dialog->accept();
        }));

        Wt::WPushButton *cancel = new Wt::WPushButton(Wt::WString::tr("Cancel"), dialog->footer());
        hbox_dlg->addWidget(cancel);
        cancel->setStyleClass("cancel_button");
        cancel->clicked().connect(dialog, &Wt::WDialog::reject);
        dialog->rejectWhenEscapePressed();

        dialog->finished().connect(std::bind([=] () {
            if (dialog->result() == Wt::WDialog::Accepted) {
                bfs::remove(file);
                bfs::remove((_abs_path / _media_path / file.stem()).string() + ".html");
                // Виджет с кнопками удаления
                removeDelButtons(vbox);
                addDelButtons(vbox);
                // Виджет с загрузчиком файла
                removeFileUpload(vbox);
                createFileUpload(vbox);
                LOG(DEBUG) << "Confirm delete: \"" << file.string() << "\"";
            } else {
                LOG(DEBUG) << "Cancel delete: \"" << file.string() << "\"";
            }
            delete dialog;
        }));

        dialog->show();
    }

    void addDelButtons(Wt::WVBoxLayout *vbox) {
        _btns_vbox = new Wt::WVBoxLayout();
        vbox->addLayout(_btns_vbox);
        auto files = updateFiles();

        // Сохранить список загруженных файлов в json
        auto mm_json = mmListToJson(files);
        std::ofstream ofs;
        ofs.open((_abs_path / _media_path / "mm_urls.json").string().c_str());
        ofs.write(mm_json.c_str(), mm_json.length());
        ofs.close();

        for (auto file : files) {
            LOG(DEBUG) << "file \"" << file.string() << "\" \n";
            Wt::WContainerWidget *container = new Wt::WContainerWidget();
            Wt::WHBoxLayout *hbox = new Wt::WHBoxLayout(container);
            container->setStyleClass("media_line_pannel");
            _btns_vbox->addWidget(container);

            // Добавить кнопку удаления
            Wt::WPushButton *del_btn = new Wt::WPushButton(Wt::WString::tr("Delete"));
            del_btn->setStyleClass("del_button");
            hbox->addWidget(del_btn);
            del_btn->clicked().connect(std::bind([=]() {
                if (not bfs::exists(file)) {
                    LOG(ERROR) << "Can`t Delete. File \"" << file.string() << "\" is not exists.";
                } else {
                    confirmDeleteBox(file, vbox);
                }
            }));

            // Добавить кнопку показа
            Wt::WContainerWidget *text_container = new Wt::WContainerWidget();
            hbox->addWidget(text_container, 1);
            std::string link_str = ("http://185.58.205.67" / _media_path / file.filename()).string();
            Wt::WString href_str = Wt::WString::fromUTF8(file.filename().string());
            Wt::WAnchor *anchor = new Wt::WAnchor(Wt::WLink(Wt::WLink::Url, link_str), href_str, text_container);
            anchor->setTarget(Wt::TargetNewWindow);
        }
    }

    void removeDelButtons(Wt::WVBoxLayout *vbox) {
        if (_btns_vbox) {
            vbox->removeItem(_btns_vbox);
            delete _btns_vbox;
            _btns_vbox = 0;
        }
    }

    void handleInternalPath(const std::string &internalPath) {
        if (internalPath == "/test") {
            LOG(DEBUG) << "IPATH: " << internalPath;
        } else {
            Wt::WApplication::instance()->setInternalPath(internalPath,  true);
            LOG(DEBUG) << "Set IPATH: " << internalPath;
        }
    }

public:
    FileStoradgePannel(const bfs::path &abs_path, const bfs::path &media_path)
        : _file_upload_contaner(nullptr)
        , _btns_vbox(nullptr)
        , _abs_path(abs_path)
        , _media_path(media_path) {
        // Добавление вертикального контейнера
        Wt::WVBoxLayout *vbox = new Wt::WVBoxLayout(this);

        // Добавление списка файлов с кнопками удаления
        addDelButtons(vbox);

        // Добавление загрузчика текстового файла
        createFileUpload(vbox);
    }
};


class WebApplication
    : public Wt::WApplication {
public:
    WebApplication(const Wt::WEnvironment &env)
        : Wt::WApplication(env) {
        bfs::path abs_path = bfs::absolute(bfs::path(this->docRoot()));
        LOG(DEBUG) << CSS_FILE;
        LOG(DEBUG) << (abs_path / LOCALE_FILE).string();

        this->useStyleSheet(CSS_FILE);
        this->messageResourceBundle().use((abs_path / LOCALE_FILE).string());
        this->setTitle(Wt::WString::tr("Title"));

        Wt::WApplication *app = Wt::WApplication::instance();
        app->setLoadingIndicator(new Wt::WOverlayLoadingIndicator());
        app->styleSheet().addRule("body", "margin: 0px");

        // Веб обработчик
        Wt::WContainerWidget *container = new Wt::WContainerWidget(this->root());
        container->setStyleClass("storadge_pannel");
        bfs::path media_path = "media";
        if (not env.getParameterValues("path").empty()) {
            media_path = bfs::path(env.getParameterValues("path")[0]);
        }
        LOG(INFO) << "MEDIA PATH: " << media_path;
        container->addWidget(new FileStoradgePannel(abs_path, media_path.string()));
    }
};


//class MediaPath
//    : public Wt::WResource {
//
//public:
//    MediaPath(Wt::WObject *parent = 0)
//        : Wt::WResource(parent) {
//    }
//
//    ~MediaPath() {
//        beingDeleted(); // see "Concurrency issues" below.
//    }
//
//    void handleRequest(const Wt::Http::Request &request, Wt::Http::Response &response) {
//        Wt::Http::ParameterMap param_map = request.getParameterMap();
//        auto iter = param_map.find("file");
//        if (iter not_eq param_map.end()) {
//            LOG(DEBUG)
//                << "file: \"" << iter->second[0] << "; len=" << request.contentLength() << "; type: " << request.contentType();
//        }
//        //response.out() << "Ok" << std::endl;
//    }
//};


////! \ brief Функция генерации web приложения
//class AppCreator {
//public:
//    Wt::WApplication* operator() (const Wt::WEnvironment& env) {
//        return new WebApplication(env);
//    }
//};
//
//
//int CustomRun(int argc, char *argv[]) {
//    try {
//        Wt::WServer server(argv[0]);
//        server.setServerConfiguration(argc, argv);
//        //server.addResource(new MediaPath(), "/rest/media");
//        server.addEntryPoint(Wt::Application, AppCreator());
//
//        if (server.start()) {
//            int sig = Wt::WServer::waitForShutdown(argv[0]);
//            std::cerr << "Shutdown (signal = " << sig << ")" << std::endl;
//            server.stop();
//
//            //if (sig == Wt::SIGHUP) {
//            //    Wt::WServer::restart(argc, argv, environ);
//            //}
//        }
//    } catch(Wt::WServer::Exception& e) {
//        LOG(ERROR) << e.what();
//        return 1;
//    } catch(std::exception& e) {
//        LOG(ERROR) << "exception: " << e.what();
//        return 1;
//    }
//    return 0;
//}
//} // tools
//} // arobot
//
//int main(int argc, char **argv) {
//    LOG_TO_STDOUT;
//    // Запуск WEB приложения
//    return arobot::tools::CustomRun(argc, argv);
//}


//! \ brief Функция генерации web приложения
Wt::WApplication* CreateApp(const Wt::WEnvironment& env) {
    return new WebApplication(env);
}
} // tools
} // arobot




int main(int argc, char **argv) {
    LOG_TO_STDOUT;
    // Запуск WEB приложения
    return Wt::WRun(argc, argv, arobot::tools::CreateApp);
}



