/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Web Сервис преобразования TTS.
 * \author Величко Ростислав
 * \date   11.12.2015
 */

/// Пример запуска: ./web-tts-server --docroot . --http-address 0.0.0.0 --http-port=8080

#include <iconv.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>

#include <stdexcept>
#include <string>
#include <chrono>
#include <thread>

#include <boost/filesystem.hpp>

#include <Wt/WContainerWidget>
#include <Wt/WOverlayLoadingIndicator>
#include <Wt/WApplication>
#include <Wt/WProgressBar>
#include <Wt/WText>
#include <Wt/WString>
#include <Wt/WLocalizedStrings>
#include <Wt/WVBoxLayout>
#include <Wt/WFileUpload>
#include <Wt/WText>
#include <Wt/WTextArea>
#include <Wt/WPushButton>
#include <Wt/WResource>
#include <Wt/Http/Request>
#include <Wt/Http/Response>

#include "Log.hpp"
#include "Singleton.hpp"


namespace arobot {
namespace tts {

namespace bfs = boost::filesystem;

static const int WAIT_WRAPPER_SERVER_TIME = 10000;
static const char *WRAPPER_PATH = WINE_TTS_SERVER_BIN;


class TTSController {
    std::shared_ptr<std::thread> _wrapper_thread;
    std::shared_ptr<std::thread> _client_thread;
    int _sock;

public:
    TTSController(const std::string &wine_tts_bin_path = WRAPPER_PATH)
        : _sock(0) {
        // Проверить наличие управляющей обёртки
        bfs::path wrapper_path = bfs::absolute(bfs::path(wine_tts_bin_path));
        if (not bfs::exists(wrapper_path)) {
            throw std::invalid_argument("File \"" + wrapper_path.string() + "\" is not exists");
        }

        // Запуск приложения в своём потоке
        _wrapper_thread = std::make_shared<std::thread>([=]() {
            return system(wrapper_path.string().c_str());
        });
        _wrapper_thread->detach();
        LOG(DEBUG) << "Wrapper is running.";

        // Подключитьcя к серверу wine TTS
        _sock = socket(AF_INET, SOCK_STREAM, 0);
        if (_sock < 0) {
            throw std::runtime_error("Can`t open socket for tts wrapper.");
        }
        LOG(DEBUG) << "Create wrapper client socket.";
        struct hostent *server = gethostbyname("127.0.0.1");
        if (not server) {
            throw std::runtime_error("No such localhost");
        }
        struct sockaddr_in serv_addr;
        bzero((char*)&serv_addr, sizeof(serv_addr));
        serv_addr.sin_family = AF_INET;
        bcopy((char*)server->h_addr, (char*)&serv_addr.sin_addr.s_addr, server->h_length);
        serv_addr.sin_port = htons(TTS_WRAPPER_PORT);

        // Ожидание запуска сервера враппера TTS
        _client_thread = std::make_shared<std::thread>([=]() {
            std::chrono::steady_clock::time_point start_time = std::chrono::steady_clock::now();
            std::chrono::milliseconds ms;
            LOG(DEBUG) << "Attempt connect to tts wrapper server.";
            do {
                ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - start_time);
            } while (connect(_sock,(struct sockaddr*)&serv_addr, sizeof(serv_addr)) < 0 and ms.count() < WAIT_WRAPPER_SERVER_TIME);

            if (ms.count() >= WAIT_WRAPPER_SERVER_TIME) {
                throw std::runtime_error("Can`t connecting to TTS wrapper. mlsec=" + std::to_string(ms.count()));
            }
        });
        _client_thread->detach();
    }

    ~TTSController() {
        close(_sock);
    }

    void textToAudio(const std::vector<char> &data) {
        std::vector<char> buf(sizeof(uint16_t), 0);
        *(uint16_t*)&buf[0] = data.size() + sizeof(uint16_t);
        buf.insert(buf.end(), data.begin(), data.end());
        if (write(_sock, &buf[0], buf.size()) < 0) {
            LOG(DEBUG) << "Can`t writing to tts wrapper socket";
        }
        LOG(DEBUG) << "> \"" << *(uint16_t*)&buf[0] << ":" << std::string(&buf[sizeof(uint16_t)], *(uint16_t*)&buf[0]) << "\"\n";
    }
};

//class Iconv {
//    iconv_t cd;
//  size_t k, f, t;
//  int se;
//  const char *code = "Вопрос!";
//  const char* in = code;
//  char buf[100];
//  char* out = buf;
//
//  cd = iconv_open("cp1251", "utf-8");
//  if( cd == (iconv_t)(-1) )
//    err( 1, "iconv_open" );
//  f = strlen(code);
//  t = sizeof buf;
//  memset( &buf, 0, sizeof buf );
//  errno = 0;
//  k = iconv(cd, &in, &f, &out, &t);
//  se = errno;
//  printf( "converted: %u,error=%d\n", (unsigned) k, se );
//
//  printf("string: %s\n", buf);
//
//  iconv_close(cd);
//}

static const size_t MAX_LOADED_FILE_SIZE = 256;
static const size_t MAX_WISIBLE_ROWS = 80;
static const size_t MAX_WISIBLE_LINES = 20;


class TTSPannel
    : public Wt::WContainerWidget {
    Wt::WFileUpload *_file_upload;
    std::vector<char> _data;

    void createFileUpload(Wt::WVBoxLayout *vbox, Wt::WTextArea *text_area) {
        _file_upload = new Wt::WFileUpload(this);
        vbox->addWidget(_file_upload);
        _file_upload->setMultiple(false);
        _file_upload->setFileTextSize(MAX_LOADED_FILE_SIZE);
        _file_upload->setProgressBar(new Wt::WProgressBar());
        _file_upload->setInline(false);

        _file_upload->fileTooLarge().connect(std::bind([=]() {
            text_area->setText("File is too large.");
            LOG(DEBUG) << "File \"" << _file_upload->clientFileName().toUTF8() << "\"is too large\n";
        }));

        _file_upload->changed().connect(std::bind([=]() {
            _file_upload->upload();
            LOG(DEBUG) << "File \"" << _file_upload->clientFileName().toUTF8() << "\"is upload\n";
        }));

        _file_upload->uploaded().connect(std::bind([=]() {
            LOG(DEBUG) << "File \"" << _file_upload->spoolFileName() << "\"is upload\n";
            std::ifstream ifs(_file_upload->spoolFileName());
            _data = std::vector<char>(std::istreambuf_iterator<char>(ifs), std::istreambuf_iterator<char>());
            text_area->setText(std::string(_data.begin(), _data.end()));
        }));
    }

    void deleteFileUpload(Wt::WVBoxLayout *vbox) {
        if(_file_upload) {
            vbox->removeWidget(_file_upload);
            delete _file_upload;
            _file_upload = 0;
        }
    }

public:
    TTSPannel()
        : _file_upload(nullptr) {
        this->setStyleClass("tts");

        // Добавление вертикального контейнера
        Wt::WVBoxLayout *vbox = new Wt::WVBoxLayout(this);

        // Добавление простого редактора текста
        Wt::WTextArea *text_area = new Wt::WTextArea();
        vbox->addWidget(text_area);
        text_area->setColumns(MAX_WISIBLE_ROWS);
        text_area->setRows(MAX_WISIBLE_LINES);
        //text_area->setText(Wt::WString::fromUTF8("Пробный текст для передачи на обработку в TTS."));

        Wt::WPushButton *send_btn = new Wt::WPushButton(Wt::WString::tr("send_btn"));
        vbox->addWidget(send_btn);
        send_btn->clicked().connect(std::bind([=]() {
            LOG(DEBUG) << "send file" << text_area->text() << "\n";
            //utils::Singleton<TTSController>::get()->textToAudio("Тестовое сообщение."); //text_area->text().narrow());
            if (_data.size()) {
                utils::Singleton<TTSController>::get()->textToAudio(_data); //text_area->text().narrow());
            }
            if (not _file_upload->empty()) {
                // Удаление отработавшего загрузчика файлов
                deleteFileUpload(vbox);
                // Добавление загрузчика текстового файла для новой отправки
                createFileUpload(vbox, text_area);
            }
        }));

        // Добавление загрузчика текстового файла
        createFileUpload(vbox, text_area);
    }
};


class RestWorker
    : public Wt::WResource {
public:
    RestWorker(Wt::WObject *parent = 0)
        : Wt::WResource(parent) {
        setInternalPath("/tts/play");
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


class WebTTSApplication
    : public Wt::WApplication {
public:
    WebTTSApplication(const Wt::WEnvironment& env)
        : Wt::WApplication(env) {
        bfs::path abs_path = bfs::absolute(bfs::path(this->docRoot()));

        this->useStyleSheet("main.css");
        this->messageResourceBundle().use((abs_path / "rus_locale").string());
        this->setTitle(Wt::WString::tr("Title"));

        Wt::WApplication *app = Wt::WApplication::instance();
        app->setLoadingIndicator(new Wt::WOverlayLoadingIndicator());
        app->styleSheet().addRule("body", "margin: 0px");

        // Веб обработчик
        Wt::WContainerWidget *container = new Wt::WContainerWidget(this->root());
        //container->setStyleClass("tts_pannel");
        container->addWidget(new TTSPannel());

        // HTTP обработчик
        new RestWorker(this);
    }
};


//! \ brief Функция генерации web приложения
Wt::WApplication* CreateApp(const Wt::WEnvironment& env) {
    return new WebTTSApplication(env);
}
} // tts
} // arobot


int main(int argc, char **argv) {
    LOG_TO_STDOUT;
    try {
        // Первичная инициализация контроллера TTS
        arobot::utils::Singleton<arobot::tts::TTSController>::get();
    } catch(std::exception &e) {
        LOG(ERROR) << "ERROR: " << e.what();
        return 1;
    }

    // Запуск WEB приложения
    return Wt::WRun(argc, argv, arobot::tts::CreateApp);
}
