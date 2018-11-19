/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Web Сервис обработки картинок с продуктовыми товарами.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include <fstream>
#include <string>
#include <memory>
#include <set>
#include <functional>

#include <boost/program_options.hpp>

#include "Log.hpp"
#include "NbClassifierModel.hpp"
#include "NbClassifier.hpp"
#include "FoodprodClassifierWorker.hpp"
#include "AddFoodprodClassifierWorker.hpp"

namespace bpo = boost::program_options;

#define DEFAULT_PORT 40000
#define DEFAULT_ENDPOIT "rest/foodprod_checker"
#define DEFAULT_CLASSIFI_ENDPOIT "rest/classifi"
#define DEFAULT_MODEL_FILE_NAME "model.nbc"

typedef arobot::webserver::WebSocketServer WebSocketServer;
typedef arobot::fpc::NbClassifierModel NbClassifierModel;
typedef arobot::fpc::AddFoodprodClassifierWorker AddFoodprodClassifierWorker;
typedef arobot::fpc::NbClassifier NbClassifier;
typedef arobot::fpc::FoodprodClassifierWorker FoodprodClassifierWorker;
typedef std::shared_ptr<NbClassifierModel> PNbClassifierModel;
typedef std::shared_ptr<AddFoodprodClassifierWorker> PAddFoodprodClassifierWorker;
typedef std::shared_ptr<NbClassifier> PNbClassifier;
typedef std::shared_ptr<FoodprodClassifierWorker> PFoodprodClassifierWorker;


int main(int argc, char**argv) {
    LOG_TO_STDOUT;
    int port;
    std::string endpoint;
    std::string classifi;
    std::string model_file_name;
    bpo::options_description desc("Web Сервис обработки картинок с продуктовыми товарами");
    desc.add_options()
        ("help,h", "Показать список параметров")
        ("port,p", bpo::value<int>(&port)->default_value(DEFAULT_PORT), "Порт подключения к сервису по websocket")
        ("endpoint,e", bpo::value<std::string>(&endpoint)->default_value(DEFAULT_ENDPOIT),
            "Рест адрес подключения к сервису")
        ("classifi,c", bpo::value<std::string>(&classifi)->default_value(DEFAULT_CLASSIFI_ENDPOIT),
            "Рест адрес подключения к сервису обучения классификатора")
        ("model,m", bpo::value<std::string>(&model_file_name)->default_value(DEFAULT_MODEL_FILE_NAME),
            "Имя файла хранения модели классификатора")
        ; //NOLINT
    bpo::variables_map vm;
    bpo::store(bpo::parse_command_line(argc, argv, desc), vm);
    bpo::notify(vm);

    if (vm.count("help")) {
        std::cout << desc << "\n";
        return 0;
    }
    /// Инициализация web сервера
    WebSocketServer server(port);
    std::mutex mutex;
    /// Инициализация объекта обслуживания модели классификатора
    PNbClassifierModel nbc_model = std::make_shared<NbClassifierModel>();
    PAddFoodprodClassifierWorker add_fcw = std::make_shared<AddFoodprodClassifierWorker>(mutex, nbc_model, model_file_name);
    /// Добавление обработчика обслуживания модели классификатора в сервис
    server.addEndpoint(classifi, add_fcw);
    /// Инициализация классификатора
    PNbClassifier nbc = std::make_shared<NbClassifier>(nbc_model);
    PFoodprodClassifierWorker fcw = std::make_shared<FoodprodClassifierWorker>(mutex, nbc);
    /// Добавление классификатора в сервис
    server.addEndpoint(endpoint, fcw);
    /// Запуск сервиса
    server.start();
    return 0;
}
