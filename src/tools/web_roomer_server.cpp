/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Web Сервис организации комнат для объмена данными.
 * \author Величко Ростислав
 * \date   01.25.2016
 */

/// Пример запуска: ./web-roomer

#include <iostream>
#include <set>
#include <map>
#include <vector>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <functional>

#include <boost/program_options.hpp>

#include <json/json.h>

#include "Log.hpp"
#include "server_wss.hpp"

namespace arobot {
namespace tools {

typedef SimpleWeb::SocketServer<SimpleWeb::WSS> WssServer;
typedef WssServer::Endpoint Endpoint;
typedef WssServer::Connection Connection;
typedef WssServer::Message Message;
typedef WssServer::SendStream SendStream;


class RoomServer
    : public WssServer {
    typedef std::set<std::string> RoomIds;
    typedef std::map<size_t, RoomIds> ConnectionIds;

    Endpoint& _endpoint;
    ConnectionIds _connection_ids;

    std::mutex _mutex;

    void sendMessage(std::shared_ptr<Connection> connection, const std::string &msg) {
        auto send_stream = std::make_shared<SendStream>();
        *send_stream << msg;
        this->send(connection, send_stream, [](const boost::system::error_code &ec) {
            if(ec) {
                LOG(ERROR) << ec << ", message: \"" << ec.message() << "\"";
            }
        });
    }

    void sendError(std::shared_ptr<Connection> connection, const std::string &error) {
        std::stringstream ss;
        ss << "{\"error\":\"" << error << "\"}";
        LOG(ERROR) << ss.str();
        sendMessage(connection, ss.str());
    }

public:
    RoomServer(unsigned short port, const std::string &endpoint, const std::string &srvcrt, const std::string &srvkey)
        : WssServer(port, std::thread::hardware_concurrency() + 1, srvcrt, srvkey)
        , _endpoint(WssServer::endpoint["^/" + endpoint + "/?$"]) {
        namespace sph = std::placeholders;
        LOG(INFO) << "Start: " << port << ", \"" << endpoint << "\"";

        _endpoint.onmessage = [this](std::shared_ptr<Connection> connection, std::shared_ptr<Message> message) {
            std::string msg = message->string();
            LOG(DEBUG) << "msg < \"" << msg << "\"";
            try {
                Json::Value json;
                Json::Reader reader;
                if (reader.parse(msg, json)) {
                    if (not json["room_id"].isNull()) {
                        // Скопировать информацию о комнатах
                        ConnectionIds connection_ids;
                        {
                            std::lock_guard<std::mutex> lock(_mutex);
                            connection_ids = _connection_ids;
                        }

                        std::string room_id = json["room_id"].asString();
                        size_t input_conn_id = (size_t)connection.get();

                        // Добавить подключение, если отсутствует
                        auto conn_it = connection_ids.find(input_conn_id);
                        if (conn_it == connection_ids.end()) {
                            std::set<std::string> rooms;
                            rooms.insert(room_id);
                            connection_ids.insert(std::make_pair(input_conn_id, rooms));
                            LOG(DEBUG) << "new connection: " << input_conn_id << " and room: \"" << room_id << "\"";
                        } else {

                            // Добавить комнату к текущему подключению, если отсутствует
                            if (conn_it->second.insert(room_id).second) {
                                LOG(DEBUG) << input_conn_id << " new room: \"" << room_id << "\"";
                            }
                        }

                        // Транслировать сообщение комнете
                        if (not json["msg"].isNull()) {
                            for(auto con : _endpoint.get_connections()) {
                                size_t cur_conn_id = (size_t)con.get();
                                if (cur_conn_id not_eq input_conn_id) {
                                    LOG(DEBUG) << "send: " << input_conn_id << " -> " << cur_conn_id;
                                    // Проверить на критическую ошибку
                                    conn_it = connection_ids.find(cur_conn_id);
                                    if (conn_it not_eq connection_ids.end()) {
                                        auto to_room_it = conn_it->second.find(room_id);

                                        // Если подключение принадлежит обрабатываемой комнате - отправить сообщение
                                        if (to_room_it not_eq conn_it->second.end()) {
                                            std::stringstream ss;
                                            if (json["msg"].isString()) {
                                                ss << "{\"msg\":\"" << json["msg"].asString() << "\"}";
                                            } else {
                                                Json::FastWriter fastWriter;
                                                ss << "{\"msg\":" << fastWriter.write(json["msg"]) << "}";
                                            }
                                            LOG(DEBUG) << input_conn_id << " -> " << cur_conn_id << ": " << ss.str();
                                            sendMessage(con, ss.str());
                                        }
                                    } else {
                                        LOG(FATAL) << "Can`t find connection \"" << cur_conn_id << "\"";
                                    }
                                }
                            }
                        }

                        // Актуализировать информацию о комнатах
                        {
                            std::lock_guard<std::mutex> lock(_mutex);
                            _connection_ids = connection_ids;
                        }
                    } else {
                        sendError(connection, "Can`t find value 'room_id'");
                    }
                } else {
                    sendError(connection, "Can`t parse input json message '" + msg + "'");
                }
            } catch (const std::exception &e) {
                sendError(connection, "Can`t parse input json message '" + msg + "'; " + e.what());
            }
        };

        _endpoint.onopen = [](std::shared_ptr<Connection> connection) {
            LOG(INFO) << "Opened connection: " << (size_t)connection.get();
        };

        _endpoint.onclose = [this](std::shared_ptr<Connection> connection, int status, const std::string& reason) {
            size_t id = (size_t)connection.get();
            LOG(INFO) << "Closed connection: " << id << " with status code " << status;
            std::lock_guard<std::mutex> lock(_mutex);
            _connection_ids.erase(id);
        };

        _endpoint.onerror = [this](std::shared_ptr<Connection> connection, const boost::system::error_code& ec) {
            size_t id = (size_t)connection.get();
            LOG(ERROR) << "Connection: " << id << ", " << ec << ", \"" << ec.message() << "\"";
            std::lock_guard<std::mutex> lock(_mutex);
            _connection_ids.erase(id);
        };

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
        int port;
        std::string endpoint;
        std::string srvcrt;
        std::string srvkey;
        bpo::options_description desc("Сервер организации комнат м/у роботами и операторами");
        desc.add_options()
          ("help,h", "Показать список параметров")
          ("port,p", bpo::value<int>(&port)->default_value(8085), "Порт для подключения комнат")
          ("endpoint,e", bpo::value<std::string>(&endpoint)->default_value("rest/rooms"), "Рест адрес подключения к комнатам")
          ("srvcrt,c", bpo::value<std::string>(&srvcrt)->default_value("/etc/nginx/ssl/server.crt"), "SSL сертификат")
          ("srvkey,k", bpo::value<std::string>(&srvkey)->default_value("/etc/nginx/ssl/server.key"), "SSL ключь")
          ("verbose,v", "Выводить подробную информацию")
          ; //NOLINT
        bpo::variables_map vm;
        bpo::store(bpo::parse_command_line(argc, argv, desc), vm);
        bpo::notify(vm);

        if (vm.count("help")) {
            std::cout << desc << "\n";
            return 0;
        }
        arobot::tools::RoomServer choper(port, endpoint, srvcrt, srvkey);
    } catch (std::exception &e) {
        LOG(ERROR) << e.what() << "\n";
    }
    return 0;
}
