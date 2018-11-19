/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Web Сервис актуализации конфигурационного файла пресетов.
 * \author Величко Ростислав
 * \date   01.16.2016
 */

/// Пример запуска: ./web-presets --docroot . --http-address 0.0.0.0 --http-port=8082
/// Пример проверки: curl -i -H "Accept: application/json" -H "Content-Type: application/json" -X POST -d "{\"json\":{\"data\":\"here\"}}" http://0.0.0.0:8082/rest/presets?file=presets\.json

#include <stdexcept>
#include <string>
#include <algorithm>
#include <thread>

#include <boost/filesystem.hpp>
#include <boost/lexical_cast.hpp>

#include <Wt/WServer>
#include <Wt/WResource>
#include <Wt/Http/Response>

#include <json/json.h>

#include "Log.hpp"


namespace arobot {
namespace tools {

namespace bfs = boost::filesystem;

class RestPresets
    : public Wt::WResource {

public:
    virtual ~RestPresets()
    {}

protected:
    virtual void handleRequest(const Wt::Http::Request &request, Wt::Http::Response &response) {
        Wt::Http::ParameterMap param_map = request.getParameterMap();
        auto iter = param_map.find("file");
        if (iter not_eq param_map.end()) {
            LOG(DEBUG)
                << "file: \"" << iter->second[0] << "; len=" << request.contentLength() << "; type: " << request.contentType();
            if (request.contentLength() and request.contentType() == "application/json") {
                Json::Value json;
                try {
                    std::string str = std::string(std::istreambuf_iterator<char>(request.in()), std::istreambuf_iterator<char>());
                    //request.in() >> json;
                    std::ofstream ofs(iter->second[0]);
                    //ofs << json;
                    ofs << str;
                    ofs.close();
                    //LOG(DEBUG) << json.asString() << "\n";
                    LOG(DEBUG) << "\"" << str << "\"";
                } catch (std::exception &e) {
                    response.out() << "Can`t parse json." << std::endl;
                }
            }
            response.addHeader("Server", "Presets 0.1");
            response.addHeader("Access-Control-Allow-Origin", "*");
            response.addHeader("Access-Control-Allow-Headers", "Content-Type");
            response.setMimeType("text/plain");
            response.out() << "Ok";
        }
    }
};
} // tools
} // arobot


int main(int argc, char **argv) {
    LOG_TO_STDOUT;
    try {
        Wt::WServer server(argv[0]);
        server.setServerConfiguration(argc, argv);
        arobot::tools::RestPresets rest;
        server.addResource(&rest, "/rest/presets");

        if (server.start()) {
            Wt::WServer::waitForShutdown();
            server.stop();
        }
    } catch (Wt::WServer::Exception& e) {
        std::cerr << e.what() << std::endl;
    } catch (std::exception &e) {
        std::cerr << "exception: " << e.what() << std::endl;
    }
}
