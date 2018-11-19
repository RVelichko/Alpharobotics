/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Web Сервис организации чата робота с опараторами.
 * \author Величко Ростислав
 * \date   01.25.2016
 */

/// Пример запуска: ./web-chat-operator -c ./config.json

#include <iostream>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <functional>

#include <boost/program_options.hpp>

#include <json/json.h>

#include "Log.hpp"
#include "server_ws.hpp"

namespace arobot {
namespace tools {

typedef SimpleWeb::SocketServer<SimpleWeb::WS> WsServer;
typedef WsServer::Endpoint Endpoint;
typedef WsServer::Connection Connection;
typedef WsServer::Message Message;
typedef WsServer::SendStream SendStream;


class ChatOperatorServer
    : public WsServer {
    Endpoint& _robot_side;
    Endpoint& _operator_side;

    typedef std::map<size_t, std::pair<std::string, size_t>> RobotConnection;
    typedef std::map<size_t, std::pair<std::string, std::vector<size_t>>> OperatorConnection;

    RobotConnection _robot_connection_ids;
    OperatorConnection _operator_connection_ids;

    void addRobotConnection(size_t id, const std::string &name) {
        auto iter = _robot_connection_ids.find(id);
        if(iter not_eq _robot_connection_ids.end()) {
            if (iter->second.first.empty()) {
                iter->second.first = name;
                LOG(INFO) << "add \"" << name << "\"";
            } else {
                LOG(INFO) << "Can`t add \"" << name << "\", is exists.";
            }
        } else {
            _robot_connection_ids.insert(std::make_pair(id, std::make_pair(name, 0)));
            LOG(INFO) << "new robot: " << id << " \"" << name << "\", " << _robot_connection_ids.size();
        }
    }

    void addOperatorConnection(size_t id, const std::string &name) {
        auto iter = _operator_connection_ids.find(id);
        if(iter not_eq _operator_connection_ids.end()) {
            if (iter->second.first.empty()) {
                iter->second.first = name;
                LOG(INFO) << "add \"" << name << "\"";
            } else {
                LOG(INFO) << "Can`t add \"" << name << "\", is exists.";
            }
        } else {
            _operator_connection_ids.insert(std::make_pair(id, std::make_pair(name, std::vector<size_t>())));
            LOG(INFO) << "new operator: " << id << " \"" << name << "\", " << _operator_connection_ids.size();
        }
    }

    void removeRobotConnection(size_t id) {
        LOG(INFO) << "Robot: " << id;
        auto iter = _robot_connection_ids.find(id);
        if(iter not_eq _robot_connection_ids.end()) {
            LOG(INFO) << "remove \"" << iter->second.first << "\"";
            if (iter->second.second) {
                for(auto oper : _operator_side.get_connections()) {
                    if ((size_t)oper.get() == iter->second.second) {
                        sendMessage(oper, "\"robot\":\"" + iter->second.first + "\",\"event\":\"remove\"");
                        break;
                    }
                }
            }
            _robot_connection_ids.erase(iter);
        }
    }

    void removeOperatorConnection(size_t id) {
        LOG(INFO) << "Operator: " << id;
        auto iter = _operator_connection_ids.find(id);
        if(iter not_eq _operator_connection_ids.end()) {
            LOG(INFO) << "remove \"" << iter->second.first << "\"";
            _operator_connection_ids.erase(iter);
            for (auto robot : _robot_connection_ids) {
                if (robot.second.second == id) {
                    robot.second.second = 0;
                    break;
                }
            }
        }
    }

    void makeRobotCommand(std::shared_ptr<Connection> connection, const Json::Value &json) {
        auto send = [=](const std::string &type) {
            auto robot_iter = _robot_connection_ids.find((size_t)connection.get());
            if(robot_iter not_eq _robot_connection_ids.end()) {
                for(auto oper : _operator_side.get_connections()) {
                    LOG(DEBUG) << "operator < " << (size_t)oper.get() << ": " << robot_iter->second.first;
                    if ((size_t)oper.get() == robot_iter->second.second) {
                        std::string text = json[type].asString();
                        LOG(DEBUG) << type << " < " << text;
                        sendMessage(oper, "{\"robot\":\"" + robot_iter->second.first + "\",\"" + type + "\":\"" + text + "\"}");
                        break;
                    }
                }
            }
        };

        if (not json["text"].isNull()) {
            send("text");
        } else if (not json["resp"].isNull()) {
            send("resp");
        } else {
            LOG(DEBUG) << "Connect robot: \"" << json["robot"].asString() << "\"";
            addRobotConnection((size_t)connection.get(), json["robot"].asString());
            sendMessage(connection, "{\"robot\":\"" + json["robot"].asString() + "\"}");
        }
    }

    void makeOperatorCommand(std::shared_ptr<Connection> connection, const Json::Value &json) {
        if (not json["text"].isNull()) {
            std::string text = json["text"].asString();
            LOG(DEBUG) << "text < " << text;
            for (auto &robot : _robot_connection_ids) {
                if (robot.second.second == (size_t)connection.get()) {
                    LOG(DEBUG) << robot.first << ": send to robot: " << text;
                    for(auto robot_con : _robot_side.get_connections()) {
                        if ((size_t)robot_con.get() == robot.first) {
                            sendMessage(robot_con, "{\"text\":\"" + text + "\"}");
                            return;
                        }
                    }
                }
            }
            LOG(ERROR) << (size_t)connection.get() << ": can`t send to robot";
            sendMessage(connection, "{\"error\":\"can`t send to robot\"}");
        } else if (not json["cmd"].isNull()) {
            std::string cmd = json["cmd"].asString();
            LOG(DEBUG) << "cmd < \"" << cmd << "\"";
            if (not strcmp("get", cmd.c_str())) {
                std::string robot_str = json["robot"].asString();
                for (auto &robot : _robot_connection_ids) {
                    if (not strcmp(robot.second.first.c_str(), robot_str.c_str())) {
                        robot.second.second = (size_t)connection.get();
                        LOG(DEBUG) << robot.first << ": get robot: \"" << robot_str << "\" + " << robot.second.second;
                        return;
                    }
                }
                LOG(ERROR) << (size_t)connection.get() << ": can`t get robot: \"" << robot_str << "\"";
                sendMessage(connection, "{\"error\":\"can`t get robot: " + robot_str + "\"}");
            } else {
                LOG(ERROR) << (size_t)connection.get() << ": undefined cmd: \"" << cmd << "\"";
                sendMessage(connection, "{\"error\":\"undefined cmd: " + cmd + "\"}");
            }
        } else {
            std::string str = json["operator"].asString();
            LOG(DEBUG) << "Connect operator: \"" << str << "\"";
            addOperatorConnection((size_t)connection.get(), str);

            // Отправить список подключённых роботов
            Json::Value robots;
            for (const auto &robot : _robot_connection_ids) {
                robots.append(robot.second.first);
            }
            Json::StyledWriter writer;
            sendMessage(connection, writer.write(robots));
            LOG(DEBUG) << "robots list: " << writer.write(robots);
        }
    }

    void sendMessage(std::shared_ptr<Connection> connection, const std::string &msg) {
        auto send_stream = std::make_shared<SendStream>();
        *send_stream << msg;
        this->send(connection, send_stream, [](const boost::system::error_code &ec) {
            if(ec) {
                LOG(ERROR) << ec << ", message: \"" << ec.message() << "\"";
            }
        });
    }

    void connectSide(const std::string &type, Endpoint& side,
                     const std::function<void(std::shared_ptr<Connection> connection, const Json::Value &json)> &cmd_func,
                     const std::function<void(size_t, const std::string&)> &add_func,
                     const std::function<void(size_t)> &remove_func) {
        side.onmessage = [type, cmd_func, this](std::shared_ptr<Connection> connection, std::shared_ptr<Message> message) {
            std::string msg = message->string();
            LOG(DEBUG) << "msg < \"" << msg << "\"";
            try {
                Json::Value json;
                Json::Reader reader;
                if (reader.parse(msg, json)) {
                    if (not json[type].isNull()) {
                        cmd_func(connection, json);
                    } else {
                        sendMessage(connection, "ERROR: Can`t find type name value.");
                    }
                } else {
                    sendMessage(connection, "ERROR: Can`t parse input json: \"" + msg + "\"");
                }
            } catch (const std::exception &e) {
                sendMessage(connection, "ERROR: Can`t find robot_name value.");
            }
        };

        side.onopen = [add_func](std::shared_ptr<Connection> connection) {
            LOG(INFO) << "Opened connection: " << (size_t)connection.get();
            add_func((size_t)connection.get(), "");
        };

        side.onclose = [remove_func](std::shared_ptr<Connection> connection, int status, const std::string& reason) {
            size_t id = (size_t)connection.get();
            LOG(INFO) << "Closed connection: " << id << " with status code " << status;
            remove_func(id);
        };

        side.onerror = [remove_func](std::shared_ptr<Connection> connection, const boost::system::error_code& ec) {
            size_t id = (size_t)connection.get();
            LOG(INFO) << "Connection: " << id << ", " << ec << ", \"" << ec.message() << "\"";
            remove_func(id);
        };
    }

public:
    ChatOperatorServer(unsigned short port, size_t num_threads)
        : WsServer(port, num_threads)
        , _robot_side(WsServer::endpoint["^/robot_side/?$"])
        , _operator_side(WsServer::endpoint["^/operator_side/?$"]) {
        namespace sph = std::placeholders;

        // Подключение робота
        connectSide("robot", _robot_side,
                    std::bind(&ChatOperatorServer::makeRobotCommand, this, sph::_1, sph::_2),
                    std::bind(&ChatOperatorServer::addRobotConnection, this, sph::_1, sph::_2),
                    std::bind(&ChatOperatorServer::removeRobotConnection, this, sph::_1));

        // Подключение operatora
        connectSide("operator", _operator_side,
                    std::bind(&ChatOperatorServer::makeOperatorCommand, this, sph::_1, sph::_2),
                    std::bind(&ChatOperatorServer::addOperatorConnection, this, sph::_1, sph::_2),
                    std::bind(&ChatOperatorServer::removeOperatorConnection, this, sph::_1));

        std::thread thread([this](){
            this->start();
        });
        thread.join();
    }
};
} // tools
} // arobot


namespace bpo = boost::program_options;

int main(int argc, char **argv) {
    LOG_TO_STDOUT;
    try {
        arobot::tools::ChatOperatorServer choper(8083, std::thread::hardware_concurrency() + 1);
    } catch (std::exception &e) {
        LOG(ERROR) << e.what() << "\n";
    }
    return 0;
}
