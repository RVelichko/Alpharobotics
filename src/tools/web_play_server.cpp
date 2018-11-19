/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Web Сервис хранения мелиа-файлов.
 * \author Величко Ростислав
 * \date   11.12.2015
 */

/// Пример запуска: ./web-media-storadge --docroot . --http-address 0.0.0.0 --http-port=8080

#include <stdexcept>
#include <string>
#include <algorithm>
#include <thread>

#include <boost/filesystem.hpp>
#include <boost/range/iterator_range.hpp>

#include <Wt/WContainerWidget>
#include <Wt/WOverlayLoadingIndicator>
#include <Wt/WApplication>
#include <Wt/WProgressBar>
#include <Wt/WString>
#include <Wt/WVBoxLayout>
#include <Wt/WHBoxLayout>
#include <Wt/WFileUpload>
#include <Wt/WText>
#include <Wt/WPushButton>
#include <Wt/WLabel>
#include <Wt/WResource>
#include <Wt/Http/Response>

#include "Log.hpp"
#include "Singleton.hpp"


namespace arobot {
namespace tools {

namespace bfs = boost::filesystem;


class PlayPannel
    : public Wt::WContainerWidget {
    bfs::path _data_path;

    std::vector<bfs::path> updateFiles() {
        std::vector<bfs::path> files;
        if(bfs::is_directory(_data_path)) {
            for(auto& entry : boost::make_iterator_range(bfs::directory_iterator(bfs::path(_data_path)), {})) {
                if (entry.path().extension() == ".wav") {
                    files.push_back(entry.path());
                }
            }
        }
        return files;
    }

public:
    PlayPannel(const std::string &data_path)
        : _data_path(data_path) {
        // Добавление вертикального контейнера
        Wt::WVBoxLayout *vbox = new Wt::WVBoxLayout(this);

        for (auto file : updateFiles()) {
            LOG(DEBUG) << "file \"" << file.string() << "\" \n";
            Wt::WHBoxLayout *hbox = new Wt::WHBoxLayout();
            vbox->addLayout(hbox);

            Wt::WPushButton *play_btn = new Wt::WPushButton("Play");
            hbox->addWidget(play_btn);
            play_btn->clicked().connect(std::bind([=]() {
                if (not bfs::exists(file)) {
                    LOG(ERROR) << "File \"" << file.string() << "\" is not exists.";
                } else {
                    std::thread thread([=]() {
                        LOG(ERROR) << "Play file \"" << file.string() << "\"...";
                        return system(("aplay " + file.string()).c_str());
                    });
                    thread.detach();
                }
            }));
            hbox->addWidget(new Wt::WLabel(file.string()), 1);
        }
    }
};

class RestWorker
    : public Wt::WResource {
public:
    RestWorker(Wt::WObject *parent = 0)
        : Wt::WResource(parent) {
        setInternalPath("/rest/play");
    }

    ~RestWorker() {
        beingDeleted(); // see "Concurrency issues" below.
    }

    void handleRequest(const Wt::Http::Request &request, Wt::Http::Response &response) {
        //LOG(DEBUG) <<
        Wt::Http::ParameterMap param_map = request.getParameterMap();

        response.out() << "Send text to TTS converter." << std::endl;
    }
};


class WebApplication
    : public Wt::WApplication {
public:
    WebApplication(const Wt::WEnvironment& env)
        : Wt::WApplication(env) {
        bfs::path abs_path = bfs::absolute(bfs::path(this->docRoot()));

        this->setTitle("Media Play");

        Wt::WApplication *app = Wt::WApplication::instance();
        app->setLoadingIndicator(new Wt::WOverlayLoadingIndicator());
        app->styleSheet().addRule("body", "margin: 0px");

        // Веб обработчик
        Wt::WContainerWidget *container = new Wt::WContainerWidget(this->root());
        container->addWidget(new PlayPannel(abs_path.string()));

        new RestWorker(this);
    }
};


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

