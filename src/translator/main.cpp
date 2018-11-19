/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Web Сервис организации трансляции данных м/у клиентом и оператором.
 * \author Величко Ростислав
 * \date   23.01.2017
 */

#include <memory>

#include <boost/program_options.hpp>
#include <boost/regex.hpp>

#include "ClientTranslatorWorker.hpp"
#include "OperatorTranslatorWorker.hpp"

#define DEFAULT_PORT 10000

typedef arobot::trans::SingleClientRoomController SingleClientRoomController;
typedef arobot::trans::PSingleClientRoomController PSingleClientRoomController;
typedef arobot::trans::ClientTranslatorWorker ClientTranslatorWorker;
typedef arobot::trans::OperatorTranslatorWorker OperatorTranslatorWorker;
typedef std::shared_ptr<ClientTranslatorWorker> PClientTranslatorWorker;
typedef std::shared_ptr<OperatorTranslatorWorker> POperatorTranslatorWorker;
typedef arobot::webserver::WSServer WSServer;

namespace bpo = boost::program_options;

int main(int argc, char **argv) {
    LOG_TO_STDOUT;
    try {
        int port;
        std::string client_point;
        std::string operator_point;
        std::string srvcrt;
        std::string srvkey;
        bpo::options_description desc("Сервер организации комнат м/у клиентом и операторами.");
        desc.add_options()
          ("help,h", "Показать список параметров")
          ("port,p", bpo::value<int>(&port)->default_value(DEFAULT_PORT), "Порт для подключения")
          ("client_point,r", bpo::value<std::string>(&client_point)->default_value("^/translator/client?$"),
           "Рест адрес подключения робота")
          ("operator_point,o", bpo::value<std::string>(&operator_point)->default_value("^/translator/operator/?$"),
           "Рест адрес подключения оператора")
          ("srvcrt,c", bpo::value<std::string>(&srvcrt), "SSL сертификат")
          ("srvkey,k", bpo::value<std::string>(&srvkey), "SSL ключ")
          ("verbose,v", "Выводить подробную информацию")
          ; //NOLINT
        bpo::variables_map vm;
        bpo::store(bpo::parse_command_line(argc, argv, desc), vm);
        bpo::notify(vm);

        if (vm.count("help")) {
            std::cout << desc << "\n";
            return 0;
        }

        PSingleClientRoomController room_controller = std::make_shared<SingleClientRoomController>(); ///< Контроллер комнат
        std::mutex mutex; ///< Объект синхронизации доступа к общим объектам из разных воркеров и подключений
        /// Точка подключения робота - обработчика событий
        PClientTranslatorWorker client_worker = std::make_shared<ClientTranslatorWorker>(mutex, room_controller);
        /// Точка подключения оператора - логирования и управления роботом
        POperatorTranslatorWorker operator_worker = std::make_shared<OperatorTranslatorWorker>(mutex, room_controller);

        /// Конструирование сервера
        WSServer p2p(port, srvcrt, srvkey,
                     std::make_pair(client_point, client_worker),
                     std::make_pair(operator_point, operator_worker));
    } catch (std::exception &e) {
        LOG(ERROR) << e.what() << "\n";
    }
    return 0;
}
