/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Web Сервис организации распределения видео фреймов по операторам.
 * \author Величко Ростислав
 * \date   24.11.2016
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

#include <boost/program_options.hpp>
#include <boost/regex.hpp>

#include <json/json.h>

#include "Log.hpp"
#include "Timer.hpp"
#include "RoomController.hpp"
#include "WebSocketServer.hpp"


namespace arobot {
namespace tools {

typedef utils::RoomData<Json::Value> RoomFramesData;
typedef typename RoomFramesData::SingleRobotMembers SingleRobotRoomMembers;
typedef utils::RoomController<Json::Value, SingleRobotRoomMembers> SingleRobotRoomController;
typedef std::shared_ptr<SingleRobotRoomController> PSingleRobotRoomController;

typedef webserver::Worker Worker;
typedef webserver::ConnectionValue ConnectionValue;
typedef webserver::ConnectionValuesIter ConnectionValuesIter;
typedef webserver::PConnectionValue PConnectionValue;

/**
 * Базовый клас, предоставляющий обобщённый набор функций
 */
class BaseWorker
    : public Worker {
protected:
    typedef std::function<void(const std::string&, const Json::Value&)> ConcreteFunc;

    PSingleRobotRoomController _room_controller;

    void parseMessage(const std::string &msg, const ConcreteFunc &func) {
        try {
            Json::Value json;
            std::string room_id;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                Json::Reader reader;
                if (reader.parse(msg, json) and not json["room_id"].empty()) {
                    room_id = json["room_id"].asString();
                }
            };
            if (not room_id.empty()) {
                func(room_id, json);
            } else {
                LOG(ERROR) << "Can`t find value \"room_id\".";
            }
        } catch(std::exception &e) {
            LOG(ERROR) << e.what();
        }
    }
public:
    BaseWorker(std::mutex &mutex, const PSingleRobotRoomController &room_controller)
        : Worker(mutex)
        , _room_controller(room_controller)
    {}

    virtual ~BaseWorker()
    {}
};


namespace ph = std::placeholders;

/**
 * Клас, обрабатывающий подключения от робота
 */
class RobotFramesWorker
    : public BaseWorker {
    typedef webserver::ConnectionValue ConnectionValue;
    struct ConnectionRoom
        : public ConnectionValue {
        std::string _room_id; ///< Идентификатор комнаты
        std::string _buf; ///< Буфер фрейма с робота
        PSingleRobotRoomController _room_controller; ///< Контроллер комнаты
        virtual ~ConnectionRoom() {
            auto members = std::make_tuple(_connection_id, static_cast<size_t>(0));
            _room_controller->deleteFromRoom(_room_id, members);
        }
    };
    typedef std::shared_ptr<ConnectionRoom> PConnectionRoom;

    /// Отправка сообщения операторам комнаты
    void sendToRoom(const std::set<size_t> &con_ids, const std::string &json_str) {
        for (auto con_id : con_ids) {
            LOG(DEBUG) << "Room send to operator_id=" << con_id;
            _msg_func(con_id, json_str, WS_STRING_MESSAGE);
        }
    };

    virtual PConnectionValue firstMessage(size_t connection_id, const std::string &msg) {
        LOG(DEBUG) << "conid = " << connection_id << "; " << msg;
        PConnectionRoom con_room;
        auto create_func = [&](const std::string &room_id, const Json::Value &json) {
            /// Проверить подключение друго робота к комнате
            SingleRobotRoomMembers room_members;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_members = _room_controller->getRoom(room_id);
            }
            size_t another_robot_id = std::get<0>(room_members);
            if (another_robot_id == 0) {
                try {
                    if (not json["msg"].empty() and json["msg"].isObject()) {
                        const Json::Value msg_json = json["msg"];
                        const Json::Value frames_json = msg_json["frames"];
                        if (not frames_json.empty() and frames_json.isArray()) {
                            Json::FastWriter fw;
                            std::string frames = fw.write(frames_json);
                            /// Сохранить параметры комнаты
                            con_room = std::make_shared<ConnectionRoom>();
                            con_room->_room_id = room_id;
                            con_room->_room_controller = _room_controller;
                            /// Создать ссылку на комнату и связать с ней идентификатор подключения
                            std::set<size_t> operator_ids;
                            {
                                std::lock_guard<std::mutex> lock(_mutex);
                                auto members = std::make_tuple(connection_id, static_cast<size_t>(0));
                                room_members = _room_controller->addToRoom(room_id, members);
                                /// Сохранить настройки фреймов
                                _room_controller->setRoomData<Json::Value>(room_id, msg_json["frames"]);
                                /// Получить список операторов
                                std::set<size_t> operator_ids = std::get<1>(_room_controller->getRoom(room_id));
                            }
                            /// Отправить операторам сообщение о подключении робота
                            std::stringstream resp_ss;
                            resp_ss << "{\"room_id\":\"" << room_id
                                    << "\",\"robot_id\":\"" << connection_id
                                    << "\",\"frames\":" << frames << "}";
                            sendToRoom(operator_ids, resp_ss.str());
                            LOG(ERROR) << "New Robot: " << connection_id << " - frames: " << frames;
                        } else {
                            LOG(ERROR) << "Robot: " << connection_id << " - frames settings is not found.";
                        }
                    } else {
                        LOG(ERROR) << "Robot: " << connection_id << " - msg with frame settings is not found.";
                    }
                } catch(std::exception &e) {
                    LOG(ERROR) << e.what();
                }
            } else {
                /// Отправить сообщение роботу о зянятости комнаты
                std::stringstream resp_ss;
                resp_ss << "{\"room_id\":\"" << room_id
                        << "\",\"robot_id\":\"" << connection_id
                        << "\",\"msg\":\"room_busy\"}";
                _msg_func(connection_id, resp_ss.str(), WS_STRING_MESSAGE);
                LOG(ERROR) << "Room \"" << room_id << "\" is busy, by robot_id=" << another_robot_id;
            }
        };
        parseMessage(msg, create_func);
        return con_room;
    }

    virtual bool lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
        size_t connection_id = iter->first;
        try {
            Json::Value json;
            std::string room_id;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                Json::Reader reader;
                ConnectionRoom *pcon_room = dynamic_cast<ConnectionRoom*>(iter->second.get());
                pcon_room->_buf += msg;
                if (reader.parse(pcon_room->_buf, json)) {
                    if (not json["room_id"].empty()) {
                        room_id = json["room_id"].asString();
                    }
                    //LOG(DEBUG) << "conid = " << connection_id << "; msg is complete.";
                }
            }
            if (not room_id.empty() and not json["msg"].empty()) {
                auto msg_json = json["msg"];
                if (not msg_json["frame"].empty()) {
                    SingleRobotRoomMembers room_members;
                    {
                        std::lock_guard<std::mutex> lock(_mutex);
                        room_members = _room_controller->getRoom(room_id);
                        /// Отправить операторам пришедшие фреймы
                        std::set<size_t> operator_ids = std::get<1>(_room_controller->getRoom(room_id));
                        if (msg_json["frame"].isObject()) {
                            Json::FastWriter writer;
                            std::string frame = writer.write(msg_json["frame"]);
                            std::stringstream resp_ss;
                            resp_ss << "{\"room_id\":\"" << room_id
                                    << "\",\"robot_id\":\"" << connection_id
                                    << "\",\"msg\":{\"frame\":" << frame << "}}";
                            sendToRoom(operator_ids, resp_ss.str());
                        } else {
                            LOG(ERROR) << "Frame is not in json format.";
                        }
                    }
                } else {
                    LOG(ERROR) << "Robot: " << connection_id << " - frame is not found.";
                }
                std::lock_guard<std::mutex> lock(_mutex);
                ConnectionRoom *pcon_room = dynamic_cast<ConnectionRoom*>(iter->second.get());
                pcon_room->_buf.clear();
                //LOG(ERROR) << "Robot: " << connection_id << " - erase msg buffer.";
            } else {
                //LOG(ERROR) << "Robot: " << connection_id << " - msg block add to buffer.";
            }
        } catch(std::exception &e) {
            LOG(ERROR) << e.what();
        }
        return false;
    }

    //virtual void onClose(size_t connection_id, int status, const std::string& reason) {
    //}

public:
    RobotFramesWorker(std::mutex &mutex, const PSingleRobotRoomController &room_controller)
        : BaseWorker(mutex, room_controller)
    {}

    virtual ~RobotFramesWorker()
    {}
};


/**
 * Клас, обрабатывающий подключения от оператора
 */
class OperatorFramesWorker
    : public BaseWorker {
    typedef webserver::ConnectionValue ConnectionValue;
    struct ConnectionRoom
        : public ConnectionValue {
        std::string _room_id;
        PSingleRobotRoomController _room_controller; ///< Контроллер комнаты
        virtual ~ConnectionRoom() {
            auto members = std::make_tuple(static_cast<size_t>(0), _connection_id);
            _room_controller->deleteFromRoom(_room_id, members);
        }
    };
    typedef std::shared_ptr<ConnectionRoom> PConnectionRoom;

    void makeCommang(const std::string &room_id,
                     size_t connection_id,
                     const SingleRobotRoomMembers &room_ch,
                     const std::string &cmd) {
        if (cmd == "video_devices") {
            size_t robot_id = std::get<0>(room_ch);
            if (robot_id) {
                Json::FastWriter fw;
                std::string video_devices = fw.write(std::get<2>(room_ch));
                std::stringstream ss;
                ss << "{\"room_id\":\"" << room_id << "\","
                   << "\"msg\":{\"video_devices\":" + video_devices + "}}";
                LOG(DEBUG) << "send to operator: " << connection_id << "; " << ss.str();
                _msg_func(connection_id, ss.str(), WS_STRING_MESSAGE);
            }
        }
    }

    virtual PConnectionValue firstMessage(size_t connection_id, const std::string &msg) {
        /// Создать нового оператора
        LOG(DEBUG) << "conid = " << connection_id << "; " << msg;
        PConnectionRoom con_room;
        auto create_func = [&](const std::string &room_id, const Json::Value &json) {
            LOG(DEBUG) << "NEW Operator: " << connection_id;
            /// Сохранить параметры оператора
            con_room = std::make_shared<ConnectionRoom>();
            con_room->_room_id = room_id;
            con_room->_room_controller = _room_controller;
            /// Связать с комнатой идентификатор подключения
            SingleRobotRoomMembers room_members;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_members = _room_controller->addToRoom(room_id, std::make_tuple(static_cast<size_t>(0), connection_id));
            }
            if (not json["msg"].isNull() and json["msg"].isObject()) {
                Json::Value msg = json["msg"];
                if (not msg["cmd"].isNull()) {
                    makeCommang(room_id, connection_id, room_members, msg["cmd"].asString());
                }
            }
        };
        parseMessage(msg, create_func);
        return con_room;
    }

public:
    OperatorFramesWorker(std::mutex &mutex, const PSingleRobotRoomController &room_controller)
        : BaseWorker(mutex, room_controller)
    {}

    virtual ~OperatorFramesWorker()
    {}
};
} // tools
} // arobot


#define DEFAULT_PORT 20005

typedef arobot::tools::SingleRobotRoomController SingleRobotRoomController;
typedef arobot::tools::PSingleRobotRoomController PSingleRobotRoomController;
typedef arobot::tools::RobotFramesWorker RobotFramesWorker;
typedef arobot::tools::OperatorFramesWorker OperatorFramesWorker;
typedef std::shared_ptr<RobotFramesWorker> PRobotFramesWorker;
typedef std::shared_ptr<OperatorFramesWorker> POperatorFramesWorker;
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
        bpo::options_description desc("Сервер трансляции фреймов от роботов операторам, посредствам комнат.");
        desc.add_options()
          ("help,h", "Показать список параметров")
          ("port,p", bpo::value<int>(&port)->default_value(DEFAULT_PORT), "Порт для подключения")
          ("robot_point,r", bpo::value<std::string>(&robot_point)->default_value("^/rest/frames/robot/?$"),
           "Рест адрес подключения робота")
          ("operator_point,o", bpo::value<std::string>(&operator_point)->default_value("^/rest/frames/operator/?$"),
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

        PSingleRobotRoomController room_controller = std::make_shared<SingleRobotRoomController>(); ///< Контроллер комнат
        std::mutex mutex; ///< Объект синхронизации доступа к общим объектам из разных воркеров и подключений
        /// Точка подключения робота - источника фреймов
        PRobotFramesWorker robot_worker = std::make_shared<RobotFramesWorker>(mutex, room_controller);
        /// Точка подключения оператора - потребителя фреймов
        POperatorFramesWorker operator_worker = std::make_shared<OperatorFramesWorker>(mutex, room_controller);

        /// Конструирование сервера
        WSServer p2p(port, srvcrt, srvkey,
                     std::make_pair(robot_point, robot_worker),
                     std::make_pair(operator_point, operator_worker));
    } catch (std::exception &e) {
        LOG(ERROR) << e.what() << "\n";
    }
    return 0;
}
