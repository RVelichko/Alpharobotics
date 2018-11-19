/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Signaling Сервер для организации P2P медиа соединения.
 * \author Величко Ростислав
 * \date   12.10.2016
 */

#include <iostream>
#include <memory>
#include <tuple>
#include <functional>

#include <boost/program_options.hpp>
#include <boost/filesystem.hpp>

#include <json/json.h>

#include "Log.hpp"
#include "Timer.hpp"
#include "RoomController.hpp"
#include "WebSocketServer.hpp"


namespace arobot {
namespace tools {


typedef Json::Value RoomDataType; ///< Тип хранимых данных - json настройки устройств с робота
typedef utils::RoomData<RoomDataType> RoomJsonData; ///< Тип структуры хелпера для типизации комнаты 1 : 1
typedef typename RoomJsonData::SingleMembers SingleRoomMembers; ///< Тип структуры комнаты 1 : 1
typedef utils::RoomController<RoomDataType, SingleRoomMembers> SingleRoomController; ///< Тип контроллера комнат
typedef std::shared_ptr<SingleRoomController> PSingleRoomController; ///< Тип умного указателя на контроллер комнат

typedef webserver::Worker Worker;
typedef webserver::ConnectionValue ConnectionValue;
typedef webserver::ConnectionValuesIter ConnectionValuesIter;
typedef webserver::PConnectionValue PConnectionValue;


/**
 * Структура подключения с идентификатором комнаты
 */
typedef webserver::ConnectionValue ConnectionValue;
struct ConnectionRoom
    : ConnectionValue {
    std::string _room_id;                   ///< Идентификатор комнаты
    PSingleRoomController _room_controller; ///< Контроллер комнаты нужен для удаления идентификатора подключения из комнаты
};


/**
 * Базовый клас, предоставляющий обобщённый набор функций
 */
class BaseWorker
    : public Worker {
protected:
    typedef std::function<void(const std::string&, const Json::Value&)> ConcreteFunc;

    PSingleRoomController _room_controller; ///< Контроллер комнаты типа 1 : 1

    void parseMessage(const std::string &msg, const ConcreteFunc &func) {
        try {
            Json::Value json;
            Json::Reader reader;
            bool res = false;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                res = reader.parse(msg, json);
            };
            if (res) {
                if (not json["room_id"].isNull()) {
                    func(json["room_id"].asString(), json);
                } else {
                    LOG(ERROR) << "Can`t find value \"room_id\".";
                }
            } else {
                LOG(ERROR) << "Can`t parse recieved json: \"" << msg << "\"";
            }
        } catch(std::exception &e) {
            LOG(ERROR) << e.what();
        }
    }

    std::string getRoomId(size_t connection_id) {
        std::string room_id;
        {
            std::lock_guard<std::mutex> lock(_mutex);
            ConnectionValuesIter iter = _connection_values.find(connection_id);
            if (iter not_eq _connection_values.end()) {
                ConnectionRoom *con_rom = dynamic_cast<ConnectionRoom*>(iter->second.get());
                if (con_rom) {
                    room_id = con_rom->_room_id;
                }
            }
        }
        return room_id;
    }

    virtual void sendCloseTo(const std::string &room_id, const SingleRoomMembers &room_ch) = 0;

    virtual void sendClose(size_t connection_id) {
        /// Получить ссылку на комнату и идентификатор подключения
        std::string room_id = getRoomId(connection_id);
        if (not room_id.empty()) {
            SingleRoomMembers room_ch;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_ch = _room_controller->getRoom(room_id);
            }
            sendCloseTo(room_id, room_ch);
        }
    }

    virtual void onError(size_t connection_id, const boost::system::error_code &ec) {
        sendClose(connection_id);
        Worker::onError(connection_id, ec);
    }

    virtual void onClose(size_t connection_id, int status, const std::string &reason) {
        sendClose(connection_id);
        Worker::onClose(connection_id, status, reason);
    }

public:
    BaseWorker(std::mutex &mutex, const PSingleRoomController &room_controller)
        : Worker(mutex)
        , _room_controller(room_controller)
    {}

    virtual ~BaseWorker()
    {}
};


/**
 * Клас, обрабатывающий подключения от робота
 */
class RobotPeerWorker
    : public BaseWorker {
    struct RobotConnectionRoom
        : ConnectionRoom {
        virtual ~RobotConnectionRoom() {
            if (_room_controller) {
                _room_controller->deleteFromRoom(_room_id, std::make_tuple(_connection_id, static_cast<size_t>(0)));
            }
        }
    };
    typedef std::shared_ptr<RobotConnectionRoom> PRobotConnectionRoom;

    virtual PConnectionValue firstMessage(size_t connection_id, const std::string &msg) {
        LOG(DEBUG) << "con_id = " << connection_id << "; " << msg;
        PRobotConnectionRoom con_room;
        auto create_func = [&](const std::string &room_id, const Json::Value &json) {
            /// Сохранить параметры комнаты
            con_room = std::make_shared<RobotConnectionRoom>();
            con_room->_room_id = room_id;
            con_room->_room_controller = _room_controller;
            /// Создать ссылку на комнату и связать с ней идентификатор подключения
            SingleRoomMembers room_ch;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_ch = _room_controller->addToRoom(room_id, std::make_tuple(connection_id, static_cast<size_t>(0)));
            }
            size_t operator_id = std::get<1>(room_ch);
            LOG(DEBUG) << "room_id: " << room_id << "; {" << connection_id << "," <<  operator_id << "}";
            /// Если оператор уже подключён - оправить ему настройки источника
            if (operator_id) {
                LOG(DEBUG) << "send to operator: " << operator_id << "; \"" <<  msg << "\"";
                _msg_func(operator_id, msg, WS_STRING_MESSAGE);
            }
            /// Сохранить конфигурационные данные робота по медийным устройствам
            _room_controller->setRoomData<RoomDataType>(room_id, json);
        };
        parseMessage(msg, create_func);
        LOG(DEBUG) << "room_id: " << con_room->_room_id << "; [" << connection_id << "]";
        return con_room;
    }

    virtual bool lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
        size_t connection_id = iter->first;
        LOG(DEBUG) << "conid = " << connection_id << "; " << msg;
        auto send_func = [=](const std::string &room_id, const Json::Value &json) {
            /// Получить ссылку на комнату и идентификатор подключения
            SingleRoomMembers room_ch;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_ch = _room_controller->getRoom(room_id);
            }
            size_t operator_id = std::get<1>(room_ch);
            LOG(DEBUG) << "room_id: " << room_id << "; {" << connection_id << "," <<  operator_id << "}";
            /// Если оператор уже подключён - оправить ему сообщение
            if (operator_id) {
                LOG(DEBUG) << "send to operator: " << operator_id << "; \"" <<  msg << "\"";
                _msg_func(operator_id, msg, WS_STRING_MESSAGE);
            }
        };
        parseMessage(msg, send_func);
        return false;
    }

    virtual void sendCloseTo(const std::string &room_id, const SingleRoomMembers &room_ch) {
        size_t operator_id = std::get<1>(room_ch);
        if (operator_id) {
            std::stringstream ss;
            ss << "{\"room_id\":\"" << room_id << "\",\"msg\":{\"cmd\":\"close\"}}";
            _msg_func(operator_id, ss.str(), WS_STRING_MESSAGE);
        }
    }

public:
    RobotPeerWorker(std::mutex &mutex, const PSingleRoomController &room_controller)
        : BaseWorker(mutex, room_controller)
    {}

    virtual ~RobotPeerWorker()
    {}
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




/**
 * Клас, обрабатывающий подключения от оператора
 */
class OperatorPeerWorker
    : public BaseWorker {
    struct OperatorConnectionRoom
        : ConnectionRoom {
        virtual ~OperatorConnectionRoom() {
            if (_room_controller) {
                _room_controller->deleteFromRoom(_room_id, std::make_tuple(static_cast<size_t>(0), _connection_id));
            }
        }
    };
    typedef std::shared_ptr<OperatorConnectionRoom> POperatorConnectionRoom;

    void makeCommang(const SingleRoomMembers &room_ch, const std::string &cmd) {
        if (cmd == "devices") {
            size_t robot_id = std::get<0>(room_ch);
            if (robot_id) {
                size_t operator_id = std::get<1>(room_ch);
                Json::FastWriter fw;
                std::string msg = fw.write(std::get<2>(room_ch));
                LOG(DEBUG) << "send to operator: " << operator_id << "; \"" <<  msg << "\"";
                _msg_func(operator_id, msg, WS_STRING_MESSAGE);
            }
        }
    }

    virtual PConnectionValue firstMessage(size_t connection_id, const std::string &msg) {
        LOG(DEBUG) << "conid = " << connection_id << "; " << msg;
        POperatorConnectionRoom con_room;
        auto create_func = [&](const std::string &room_id, const Json::Value &json) {
            con_room = std::make_shared<OperatorConnectionRoom>();
            con_room->_room_id = room_id;
            con_room->_room_controller = _room_controller;
            SingleRoomMembers room_ch;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_ch = _room_controller->getRoom(room_id);
            }
            size_t old_operator_id = std::get<1>(room_ch);
            /// Если оператор уже подключён - оправить ему команду на отключение
            if (old_operator_id) {
                LOG(DEBUG) << "send to OLD operator: " << old_operator_id << "; \"CLOSE\"";
//                  Worker::deleteConnection(old_operator_id);
                std::stringstream ss;
                ss << "{\"room_id\":\"" << room_id << "\",\"msg\":{\"cmd\":\"close_old\"}}";
                _msg_func(old_operator_id, ss.str(), WS_STRING_MESSAGE);
            }
            /// Связать ссылку на комнату с идентификатором подключения
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_ch = _room_controller->addToRoom(room_id, std::make_tuple(static_cast<size_t>(0), connection_id));
            }
            LOG(DEBUG) << "room_id: " << room_id << "; {" << std::get<0>(room_ch) << "," <<  connection_id << "}";
            if (not json["msg"].isNull() and json["msg"].isObject()) {
                Json::Value msg = json["msg"];
                if (not msg["cmd"].isNull()) {
                    makeCommang(room_ch, msg["cmd"].asString());
                }
            }
        };
        parseMessage(msg, create_func);
        LOG(DEBUG) << "room_id: " << con_room->_room_id << "; [" << connection_id << "]";
        return con_room;
    }

    virtual bool lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
        size_t connection_id = iter->first;
        LOG(DEBUG) << "conid = " << connection_id << "; " << msg;
        auto send_func = [=](const std::string &room_id, const Json::Value &json) {
            SingleRoomMembers room_ch;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_ch = _room_controller->getRoom(room_id);
            }
            size_t robot_id = std::get<0>(room_ch);
            LOG(DEBUG) << "room_id: " << room_id << "; {" << robot_id << "," <<  connection_id << "}";
            /// Если робот уже подключён - оправить сообщение от оператора
            if (robot_id not_eq 0) {
                LOG(DEBUG) << "send to robot: " << robot_id << "; \"" <<  msg << "\"";
                _msg_func(robot_id, msg, WS_STRING_MESSAGE);
            }
        };
        parseMessage(msg, send_func);
        return false;
    }

    virtual void sendCloseTo(const std::string &room_id, const SingleRoomMembers &room_ch) {
        size_t robot_id = std::get<0>(room_ch);
        if (robot_id) {
            std::stringstream ss;
            ss << "{\"room_id\":\"" << room_id << "\",\"msg\":{\"cmd\":\"close\"}}";
            _msg_func(robot_id, ss.str(), WS_STRING_MESSAGE);
        }
    }

public:
    OperatorPeerWorker(std::mutex &mutex, const PSingleRoomController &room_controller)
        : BaseWorker(mutex, room_controller)
    {}

    virtual ~OperatorPeerWorker()
    {}
};
} // tools
} // arobot


#define DEFAULT_PORT 20004

typedef arobot::tools::SingleRoomController SingleRoomController;
typedef arobot::tools::PSingleRoomController PSingleRoomController;
typedef arobot::tools::RobotPeerWorker RobotPeerWorker;
typedef arobot::tools::OperatorPeerWorker OperatorPeerWorker;
typedef std::shared_ptr<RobotPeerWorker> PRobotPeerWorker;
typedef std::shared_ptr<OperatorPeerWorker> POperatorPeerWorker;
typedef arobot::webserver::WSServer WSServer;

namespace bpo = boost::program_options;

int main(int argc, char **argv) {
    LOG_TO_STDOUT;
    try {
        int port;
        std::string robot_point;
        std::string operator_point;
        std::string srvcrt;
        std::string srvkey;
        bpo::options_description desc("Сервер организации видеотрансляции м/у роботами и операторами.");
        desc.add_options()
          ("help,h", "Показать список параметров")
          ("port,p", bpo::value<int>(&port)->default_value(DEFAULT_PORT), "Порт для подключения")
          ("robot_point,r", bpo::value<std::string>(&robot_point)->default_value("^/rest/signaling/robot/?$"),
           "Рест адрес подключения робота")
          ("operator_point,o", bpo::value<std::string>(&operator_point)->default_value("^/rest/signaling/operator/?$"),
           "Рест адрес подключения оператора")
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

        PSingleRoomController room_controller = std::make_shared<SingleRoomController>(); ///< Контроллер комнат
        std::mutex mutex; ///< Объект синхронизации доступа к общим объектам из разных воркеров и подклю1
        /// Точка подключения робота - источника видеочений
        PRobotPeerWorker robot_peer_worker = std::make_shared<RobotPeerWorker>(mutex, room_controller);
        /// Точка подключения оператора - потребителя видео
        POperatorPeerWorker operator_peer_worker = std::make_shared<OperatorPeerWorker>(mutex, room_controller);

        /// Конструирование сервера
        WSServer p2p(port, srvcrt, srvkey,
                     std::make_pair(robot_point, robot_peer_worker),
                     std::make_pair(operator_point, operator_peer_worker));
    } catch (std::exception &e) {
        LOG(ERROR) << e.what() << "\n";
    }
    return 0;
}

