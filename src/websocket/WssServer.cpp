/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Реализация шаблонных объектов для ускорения сборки.
 * \author Величко Ростислав
 * \date   01.27.2016
 */

#include "server_wss.hpp"

namespace arobot {
namespace webserver {

typedef SimpleWeb::SocketServer<SimpleWeb::WSS> WSSServer;
typedef WSSServer::Endpoint Endpoint;
typedef WSSServer::Connection Connection;
typedef WSSServer::Message Message;
typedef WSSServer::SendStream SendStream;


class WssServer : public WSSServer
{};
} // webserver
} // arobot
