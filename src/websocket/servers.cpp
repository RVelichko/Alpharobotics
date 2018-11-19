/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Реализация шаблонных объектов для ускорения сборки.
 * \author Величко Ростислав
 * \date   01.27.2016
 */


namespace arobot {
namespace webserver {

#ifdef USE_HTTPS
#include "server_wss.hpp"

typedef SimpleWeb::SocketServer<SimpleWeb::WSS> WssServer;
typedef WssServer::Endpoint Endpoint;
typedef WssServer::Connection Connection;
typedef WssServer::Message Message;
typedef WssServer::SendStream SendStream;


class WebServer
    : public SimpleWeb::SocketServer<SimpleWeb::WSS>
{};
#else // USE_HTTPS
#include "server_ws.hpp"

typedef SimpleWeb::SocketServer<SimpleWeb::WS> WsServer;
typedef WsServer::Endpoint Endpoint;
typedef WsServer::Connection Connection;
typedef WsServer::Message Message;
typedef WsServer::SendStream SendStream;


class WebServer
    : public SimpleWeb::SocketServer<SimpleWeb::WS>
{};
#endif // USE_HTTPS
} // webserver
} // arobot
