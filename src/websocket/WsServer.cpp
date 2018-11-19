/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Реализация шаблонных объектов для ускорения сборки.
 * \author Величко Ростислав
 * \date   01.27.2016
 */

#include "server_ws.hpp"

namespace arobot {
namespace webserver {

typedef SimpleWeb::SocketServer<SimpleWeb::WS> WSServer;
typedef WSServer::Endpoint Endpoint;
typedef WSServer::Connection Connection;
typedef WSServer::Message Message;
typedef WSServer::SendStream SendStream;


class WsServer : public WSServer
{};
} // webserver
} // arobot
