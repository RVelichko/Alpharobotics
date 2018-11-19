/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Web Сервис организации работы робота.
 * \author Величко Ростислав
 * \date   16.03.2016
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


/**
 *  Класс обработки распознанных текстовых сообщений пользователей
 */
class RobotEventer {
    typedef std::function<void(const std::string&, const std::string&)> SendCallback;
    typedef std::shared_ptr<::utils::Timer> PTimer;

    std::string _name;
    Json::Value _stt_config;
    Json::Value _responces;
    bool _is_spell_timer;
    SendCallback _send_callback;
    PTimer _alarm_clocks_timer;
    std::string _last_regex_str;

    struct AlarmClock {
        int h;
        int m;
        std::string msg;
        std::string pic;
    };
    std::vector<AlarmClock> _alarm_clocks;

    /**
     *  Метод обработки событий по регулярным выражениям
     *
     * \param input_str Входная строка с распознанным ASR текстом
     */
    std::pair<std::string, std::string> searchRegexes(const std::string &input_str, bool fast) {
        std::pair<std::string, std::string> resp;
        try {
            if (not _responces["regexes"].isNull()) {
                const Json::Value regexes = _responces["regexes"];
                for (int index = 0; static_cast<size_t>(index) < regexes.size(); ++index) {
                    const Json::Value regex = regexes[index];
                    if (not regex["regex"].isNull()) {
                        std::string regex_str = regex["regex"].asString();
                        if (not regex["resp"].isNull() and regex_str not_eq _last_regex_str) {
                            /// Проверить соотвествие регулярному выражению
                            boost::smatch what;
                            if (boost::regex_search(input_str, what, boost::regex(regex_str))) {
                                /// Проверить - можно ли обрабатывать правило сразу
                                bool is_exact = false;
                                if (not regex["exact"].isNull()) {
                                    if (regex["exact"].isString()) {
                                        std::string exact = regex["exact"].asString();
                                        if (exact == "true") {
                                            is_exact = true;
                                        }
                                        if (exact == "false") {
                                            is_exact = false;
                                        }
                                        LOG(DEBUG) << "EXACT: \"" << exact << "\"; [" << regex_str << "]";
                                    }
                                    if (regex["exact"].isBool()) {
                                        is_exact = regex["exact"].asBool();
                                        LOG(DEBUG) << "EXACT: \"" << (is_exact ? "true":"false") << "\"; [" << regex_str << "]";
                                    }
                                }
                                if (fast and is_exact) {
                                    LOG(DEBUG) << "Breake: \"" << input_str << "\"; [" << regex_str << "]";
                                    break;
                                };
                                /// Выбрать ответ из списка ответов
                                const Json::Value resps = regex["resp"];
                                if (not resps.empty()) {
                                    int rid = static_cast<int>(std::floor(static_cast<double>(resps.size() - 1) *
                                                                          static_cast<double>(std::rand()) /
                                                                          static_cast<double>(RAND_MAX) + 0.5));
                                    _last_regex_str = regex["regex"].asString();
                                    std::string pic;
                                    if (not regex["pic"].isNull()) {
                                        pic = regex["pic"].asString();
                                    }
                                    resp = std::make_pair(resps[rid].asString(), pic);
                                }
                                if (regex.isObject()) {
                                    Json::FastWriter fw;
                                    std::string str = fw.write(regex);
                                    LOG(DEBUG) << "DETECTED:\n"  << str;
                                }
                            }
                        } else {
                            LOG(ERROR) << "Can`t find \"resp\" in regexes";
                        }
                    } else {
                        LOG(ERROR) << "Can`t find \"regex\" in regexes or \"regex\" is empty";
                    }
                }
            }
        } catch(std::exception &e) {
            LOG(ERROR) << e.what();
        }
        return resp;
    }

public:
    /**
     *  Конструктор осуществляет проверку конфигурации робота
     *
     * \param name       Имя робота
     * \param stt_config Конфигурация событий
     * \param callback   Калбек отправки по таймеру и будильнику
     */
    RobotEventer(const std::string &name, const Json::Value &stt_config, const SendCallback &callback)
     : _name(name)
     , _stt_config(stt_config)
     , _is_spell_timer(false)
     , _send_callback(callback) {
        LOG(DEBUG) << stt_config;
        try {
            /// Обработка конфига робота
            if (not _stt_config["responces"].isNull()) {
                _responces = _stt_config["responces"];

                 /// Проверка наличия событий в конфигурации
                if (_responces["misunderstand_perc"].isNull()) {
                    LOG(ERROR) << "Can`t find settings for misunderstand_perc";
                }
                if (_responces["misunderstand"].isNull()) {
                    LOG(ERROR) << "Can`t find settings for misunderstand";
                }
                if (_responces["spell_timeout"].isNull()) {
                    LOG(ERROR) << "Can`t find settings for spell_timeout";
                }
                if (_responces["alarm_clocks"].isNull()) {
                    LOG(ERROR) << "Can`t find settings for alarm_clocks";
                } else {
                    /// Запуск потока будильников
                    LOG(ERROR) << "Start timer for alarm_clocks";
                    const Json::Value alarm_clocks = _responces["alarm_clocks"];
                    if (not alarm_clocks["clocks"].isNull()) {
                        const Json::Value clocks = alarm_clocks["clocks"];
                        for (int index = 0; static_cast<size_t>(index) < clocks.size(); ++index) {
                            const Json::Value alarm_clock = clocks[index];
                            if (not alarm_clock["clock_h"].isNull() and
                                not alarm_clock["clock_m"].isNull() and
                                not alarm_clock["msg"].isNull() and
                                not alarm_clock["pic"].isNull()) {
                                AlarmClock ac({
                                    alarm_clock["clock_h"].asInt(),
                                    alarm_clock["clock_m"].asInt(),
                                    alarm_clock["msg"].asString(),
                                    alarm_clock["pic"].asString()
                                });
                                _alarm_clocks.push_back(ac);
                                LOG(ERROR) << "ac - " <<  ac.h << ":" << ac.m << ", " << ac.msg;
                            }
                        }
                        auto _alarm_clocks_func = [=]() {
                            try {
                                std::time_t time = std::time(nullptr);
                                for (auto alarm_clock : _alarm_clocks) {
                                    tm local_tm = *std::localtime(&time);
                                    if (alarm_clock.h == local_tm.tm_hour and
                                        alarm_clock.m == local_tm.tm_min and
                                        _send_callback) {
                                        std::stringstream ass;
                                        ass << "{\"msg\":\"" << alarm_clock.msg << "\","
                                            << "\"pic\":\"" << alarm_clock.pic << "\"}";
                                        _send_callback("alarm", ass.str());
                                    }
                                }
                            } catch(std::exception &e) {
                                LOG(ERROR) << e.what();
                            }
                        };
                        _alarm_clocks_timer = std::make_shared<::utils::Timer>(60000, true, _alarm_clocks_func);
                    } else {
                        LOG(ERROR) << "Can`t find \"alarm_clocks.clocks\" array.";
                    }
                }
                if (_responces["timeout"].isNull()) {
                    LOG(ERROR) << "Can`t find settings for timeout";
                }
                if (_responces["regexes"].isNull()) {
                    LOG(ERROR) << "Can`t find settings for regexes";
                }
                /// Запуск псевдослучайной последовательности
                std::srand(unsigned(std::time(0)));
            } else {
                LOG(ERROR) << "Can`t find settings for responces";
            }
        } catch(std::exception &e) {
            LOG(ERROR) << e.what();
        }
    }

    /**
     * Метод Включения/Выключения событий при отсутствии регулярных правил на входную фразу
     *
     * \param input_str Входная строка
     */
    void switchMisunderstand(bool flag) {
    }

    /**
     * Метод Включения/Выключения событий по таймеру
     *
     * \param input_str Входная строка
     */
    void switchTimer(bool flag) {
    }

    /**
     * Метод Включения/Выключения событий по будильнику
     *
     * \param input_str Входная строка
     */
    void switchAlarmTimer(bool flag) {
    }

    /**
     * Метод обработки распознанных строк в соотвествии с конфигурацией событий
     *
     * \param input_str Входная строка
     */
    std::pair<std::string, std::string> search(const std::string &input_str) {
        LOG(DEBUG);
        return searchRegexes(input_str, true);
    }

    /**
     * Метод обработки распознанных строк в соотвествии с конфигурацией событий с процентом распознавания
     *
     * \param input_str Входная строка
     * \param textequal Процент распознавания
     */
    std::pair<std::string, std::string> search(const std::string &input_str, size_t textequal) {
        LOG(DEBUG);
        std::pair<std::string, std::string> resp;
        try {
            if (not _stt_config["responces"].isNull() and _last_regex_str.empty()) {
                /// Обработать события при низком проценте распознавания
                if (not _responces["misunderstand_perc"].isNull()) {
                    const Json::Value misunderstand_perc = _responces["misunderstand_perc"];
                    if (not misunderstand_perc["perc"].isNull()) {
                        if (textequal < misunderstand_perc["perc"].asUInt()) {
                            if (not misunderstand_perc["resp"].isNull()) {
                                /// Выбрать ответ из списка ответов
                                const Json::Value resps = misunderstand_perc["resp"];
                                if (not resps.empty()) {
                                    int rid = std::floor(double(resps.size() - 1) * double(std::rand()) / double(RAND_MAX) + 0.5);
                                    /// Отправить ответ
                                    std::string pic;
                                    if (not misunderstand_perc["pic"].isNull()) {
                                        pic = misunderstand_perc["pic"].asString();
                                    }
                                    resp = std::make_pair(resps[rid].asString(), pic);
                                }
                            } else {
                                LOG(ERROR) << "Can`t find resp in misunderstand_perc";
                            }
                        }
                    } else {
                        LOG(ERROR) << "Can`t find perc in misunderstand_perc";
                    }
                }
                /// Обработать регулярные выражения
                if (resp.first.empty()) {
                    resp = searchRegexes(input_str, false);
                    if (resp.first.empty()) {
                        LOG(DEBUG) << "MISS";
                        /// Обработать события в случае отсутствия найденных регулярных правил
                        if (not _responces["misunderstand"].isNull()) {
                            const Json::Value misunderstand = _responces["misunderstand"];
                            if (not misunderstand["msg"].isNull()) {
                                const Json::Value msg = misunderstand["msg"];
                                if (not msg.empty()) {
                                    int mid = std::floor(double(msg.size() - 1) * double(std::rand()) / double(RAND_MAX) + 0.5);
                                    std::string pic;
                                    if (not misunderstand["pic"].isNull()) {
                                        pic = misunderstand["pic"].asString();
                                    }
                                    resp = std::make_pair(msg[mid].asString(), pic);
                                }
                            }
                        }
                    }
                }
            }
        } catch(std::exception &e) {
            LOG(ERROR) << e.what();
        }
        LOG(DEBUG) << "Last rexex: \"" << _last_regex_str << "\"";
        _last_regex_str.clear();
        return resp;
    }
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

struct NullDataType
{};

typedef utils::RoomData<NullDataType> RoomNullData;
typedef typename RoomNullData::SingleRobotMembers SingleRobotRoomMembers;
typedef utils::RoomController<NullDataType, SingleRobotRoomMembers> SingleRobotRoomController;
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


namespace phs = std::placeholders;

/**
 * Клас, обрабатывающий подключения от робота
 */
class RobotDecodeWorker
    : public BaseWorker {
    typedef std::shared_ptr<RobotEventer> PRobotEventer;

    typedef webserver::ConnectionValue ConnectionValue;
    struct ConnectionRoom
        : public ConnectionValue {
        std::string _room_id; ///< Идентификатор комнаты
        PRobotEventer _robot; ///< Обработчик робота, если nullptr - оператор
        //PSingleRoomController _room_controller;
        //
        //virtual ~ConnectionRoom() {
        //    _room_controller->deleteFromRoom(_room_id, _id);
        //}
    };
    typedef std::shared_ptr<ConnectionRoom> PConnectionRoom;

    /// Отправка сообщения операторам комнаты
    void sendToRoom(const std::set<size_t> &con_ids, const std::string &json_str) {
        for (auto con_id : con_ids) {
            _msg_func(con_id, json_str, WS_STRING_MESSAGE);
        }
    }

    virtual PConnectionValue firstMessage(size_t connection_id, const std::string &msg) {
        PConnectionRoom con_room;
        auto create_func = [&](const std::string &room_id, const Json::Value &json) {
            /// Создать нового робота
            if (not json["stt_config"].isNull()) {
                LOG(DEBUG) << "NEW Robot: " << connection_id;
                Json::Value config_json;
                Json::Reader reader;
                reader.parse(json["stt_config"].asString().c_str(), config_json);
                auto send_func = [&](const std::string &room_id, size_t id, const std::string &type, const std::string &str) {
                    /// Отправить ответ данному роботу
                    std::stringstream resp_ss;
                    resp_ss << "{\"room_id\":\"" << room_id
                            << "\",\"robot_id\":\"" << id
                            << "\",\"" << type << "\":\"" << str << "\"}";
                    _msg_func(id, resp_ss.str(), WS_STRING_MESSAGE);
                    /// Отправить ответ комнате
                    {
                        std::lock_guard<std::mutex> lock(_mutex);
                        std::set<size_t> operator_ids = std::get<1>(_room_controller->getRoom(room_id));
                        sendToRoom(operator_ids, resp_ss.str());
                    }
                    LOG(ERROR) << "Robot EVENT: \"" << type << "\": " << id << "\"" << resp_ss.str() << "\"";
                };
                /// Сохранить параметры комнаты
                con_room = std::make_shared<ConnectionRoom>();
                con_room->_room_id = room_id;
                con_room->_robot = std::make_shared<RobotEventer>(std::to_string(connection_id),
                                                                  config_json,
                                                                  std::bind(send_func, room_id, connection_id, phs::_1, phs::_2));
                /// Создать ссылку на комнату и связать с ней идентификатор подключения
                SingleRobotRoomMembers room_members;
                {
                    std::lock_guard<std::mutex> lock(_mutex);
                    room_members = _room_controller->addToRoom(room_id, std::make_tuple(connection_id, static_cast<size_t>(0)));
                }
            } else {
                LOG(ERROR) << "Robot: " << connection_id << " - stt_config is not found.";
            }
        };
        parseMessage(msg, create_func);
        return con_room;
    }

    virtual bool lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
        size_t connection_id;
        PRobotEventer robot_eventer;
        {
            std::lock_guard<std::mutex> lock(_mutex);
            connection_id = iter->first;
            ConnectionRoom *con_room = dynamic_cast<ConnectionRoom*>(iter->second.get());
            if (con_room) {
                robot_eventer = con_room->_robot;
            } else {
                LOG(ERROR) << "ConnectionRoom is not valid. Can`t get RobotEventer for connection: " << connection_id << ".";
            }
        }
        LOG(DEBUG) << "conid = " << connection_id << "; " << msg;
        auto send_func = [=](const std::string &room_id, const Json::Value &json) {
            if (not json["input_str"].isNull()) {
                SingleRobotRoomMembers room_members;
                {
                    std::lock_guard<std::mutex> lock(_mutex);
                    room_members = _room_controller->getRoom(room_id);
                }
                /// Обработать строку для робота
                if (std::get<0>(room_members)) {
                    std::string req = json["input_str"].asString();
                    /// Обработать текст процента распознования
                    uint textequal = 0;
                    std::pair<std::string, std::string> resp;
                    if (robot_eventer) {
                        if (not json["textequal"].isNull()) {
                            textequal = json["textequal"].asUInt();
                        }
                        if (not textequal) {
                            resp = robot_eventer->search(req);
                        } else {
                            resp = robot_eventer->search(req, textequal);
                        }
                    } else {
                        LOG(ERROR) << "Invalid RobotEventer for room: \"" << room_id << "\"; connection: " << connection_id << ".";
                    }
                    /// Отправить строку запроса комнате
                    std::stringstream req_ss;
                    req_ss << "{\"room_id\":\"" << room_id
                           << "\",\"robot_id\":\"" << connection_id
                           << "\",\"textequal\":\"" << textequal
                           << "\",\"req\":\"" << req << "\"}";
                    sendToRoom(std::get<1>(room_members), req_ss.str());
                    /// Отправить результат обработки строки запроса
                    if (not resp.first.empty()) {
                        /// Отправить ответ данному роботу
                        std::stringstream resp_ss;
                        resp_ss << "{\"room_id\":\"" << room_id
                                << "\",\"robot_id\":\"" << connection_id
                                << "\",\"resp\":\"" << resp.first
                                << "\",\"pic\":\"" << resp.second << "\"}";
                        _msg_func(connection_id, resp_ss.str(), WS_STRING_MESSAGE);
                        /// Отправить ответь комнате
                        sendToRoom(std::get<1>(room_members), resp_ss.str());
                    } else {
                        LOG(WARNING) << "Can`t decode: " << req_ss.str();
                    }
                }
            } else {
                LOG(ERROR) << "Robot: " << connection_id << " - input_str is not found.";
            }
        };
        parseMessage(msg, send_func);
        return false;
    }

public:
    RobotDecodeWorker(std::mutex &mutex, const PSingleRobotRoomController &room_controller)
        : BaseWorker(mutex, room_controller)
    {}

    virtual ~RobotDecodeWorker()
    {}
};


/**
 * Клас, обрабатывающий подключения от оператора
 */
class OperatorDecodeWorker
    : public BaseWorker {
    typedef webserver::ConnectionValue ConnectionValue;
    struct ConnectionRoom
        : public ConnectionValue {
        std::string _room_id;
    };
    typedef std::shared_ptr<ConnectionRoom> PConnectionRoom;

    void sendToRobot(const std::string &room_id, size_t robot_id, size_t connection_id, const Json::Value &json) {
        if (robot_id) {
            /// Функтор отправки сообщения
            auto send_func = [&](const std::string &type) {
                std::stringstream ss;
                ss << "{\"room_id\":\"" << room_id
                   << "\",\"operator_id\":\"" << connection_id
                   << "\",\"" << type << "\":\"" << json[type].asString() << "\"}";
                _msg_func(robot_id, ss.str(), WS_STRING_MESSAGE);
            };
            if (not json["msg"].isNull()) {
                send_func("msg");
            } else if (not json["move"].isNull()) {
                send_func("move");
            } else if (not json["cmd"].isNull()) {
                send_func("cmd");
            } else {
                LOG(WARNING) << "Operator: " << connection_id << " - message is not found.";
            }
        } else {
            LOG(WARNING) << "Operator: " << connection_id << " - robot is not connect.";
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
            /// Связать с комнатой идентификатор подключения
            SingleRobotRoomMembers room_members;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_members = _room_controller->addToRoom(room_id, std::make_tuple(static_cast<size_t>(0), connection_id));
            }
            /// Отправить приветствие роботу комнаты
            sendToRobot(room_id, std::get<0>(room_members), connection_id, json);
        };
        parseMessage(msg, create_func);
        return con_room;
    }

    virtual bool lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
        size_t connection_id = iter->first;
        LOG(DEBUG) << "conid = " << connection_id << "; " << msg;
        auto send_func = [=](const std::string &room_id, const Json::Value &json) {
            SingleRobotRoomMembers room_members;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_members = _room_controller->getRoom(room_id);
            }
            size_t robot_id = std::get<0>(room_members);
            LOG(DEBUG) << "room_id: " << room_id << "; {" << robot_id << "," <<  connection_id << "}";
            /// Оправить сообщение от оператора
            sendToRobot(room_id, std::get<0>(room_members), connection_id, json);
        };
        parseMessage(msg, send_func);
        return false;
    }

public:
    OperatorDecodeWorker(std::mutex &mutex, const PSingleRobotRoomController &room_controller)
        : BaseWorker(mutex, room_controller)
    {}

    virtual ~OperatorDecodeWorker()
    {}
};
} // tools
} // arobot


#define DEFAULT_PORT 20001

typedef arobot::tools::SingleRobotRoomController SingleRobotRoomController;
typedef arobot::tools::PSingleRobotRoomController PSingleRobotRoomController;
typedef arobot::tools::RobotDecodeWorker RobotDecodeWorker;
typedef arobot::tools::OperatorDecodeWorker OperatorDecodeWorker;
typedef std::shared_ptr<RobotDecodeWorker> PRobotDecodeWorker;
typedef std::shared_ptr<OperatorDecodeWorker> POperatorDecodeWorker;
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
        bpo::options_description desc("Сервер организации комнат м/у роботами и операторами с обработкой голосовых событий.");
        desc.add_options()
          ("help,h", "Показать список параметров")
          ("port,p", bpo::value<int>(&port)->default_value(DEFAULT_PORT), "Порт для подключения")
          ("robot_point,r", bpo::value<std::string>(&robot_point)->default_value("^/rest/robot?$"),
           "Рест адрес подключения робота")
          ("operator_point,o", bpo::value<std::string>(&operator_point)->default_value("^/rest/operator?$"),
           "Рест адрес подключения оператора")
          ("admin_point,o", bpo::value<std::string>(&operator_point)->default_value("^/rest/robot/admin/?$"),
           "Рест адрес подключения администратора")
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

        PSingleRobotRoomController room_controller = std::make_shared<SingleRobotRoomController>(); ///< Контроллер комнат
        std::mutex mutex; ///< Объект синхронизации доступа к общим объектам из разных воркеров и подключений
        /// Точка подключения робота - обработчика событий
        PRobotDecodeWorker robot_worker = std::make_shared<RobotDecodeWorker>(mutex, room_controller);
        /// Точка подключения оператора - логирования и управления роботом
        POperatorDecodeWorker operator_worker = std::make_shared<OperatorDecodeWorker>(mutex, room_controller);

        /// Конструирование сервера
        WSServer p2p(port, srvcrt, srvkey,
                     std::make_pair(robot_point, robot_worker),
                     std::make_pair(operator_point, operator_worker));
    } catch (std::exception &e) {
        LOG(ERROR) << e.what() << "\n";
    }
    return 0;
}
