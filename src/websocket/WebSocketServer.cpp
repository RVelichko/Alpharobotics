/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Реализация шаблонных объектов для ускорения сборки.
 * \author Величко Ростислав
 * \date   21.07.2016
 */

#include "WebSocketServer.hpp"
#include "Log.hpp"

namespace arobot {
namespace webserver {

SendWrapper::~SendWrapper()
{}


void SendWrapper::initSendFunctions(const SendMsgFunc &msg_func, const SendErrFunc &err_func) {
    LOG(DEBUG);
    _msg_func = msg_func;
    _err_func = err_func;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


void Worker::deleteConnection(size_t connection_id) {
    LOG(DEBUG) << connection_id;
    std::lock_guard<std::mutex> lock(_mutex);
    ConnectionValuesIter it = _connection_values.find(connection_id);
    if (it not_eq _connection_values.end()) {
        it->second.reset();
        _connection_values.erase(it);
    }
}


PConnectionValue Worker::firstMessage(size_t connection_id, const std::string &msg) {
    LOG(DEBUG);
    return PConnectionValue();
}


bool Worker::lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
    LOG(DEBUG);
    return true;
}


Worker::Worker(std::mutex &mutex)
    : _mutex(mutex)
{}


Worker::~Worker()
{}


void Worker::onMessage(size_t connection_id, const std::string &msg) {
    //LOG(DEBUG) << connection_id << " \"" << msg << "\"";
    //LOG(DEBUG) << connection_id;
    /// Получить локальную потоковую копию массива описателей
    ConnectionValues connection_values;
    {
        std::lock_guard<std::mutex> lock(_mutex);
        connection_values = _connection_values;
    };
    /// Обработать текущее сообщение
    ConnectionValuesIter iter = connection_values.find(connection_id);
    if (iter == connection_values.end()) {
        auto con_val = firstMessage(connection_id, msg); ///< Вызвать функцию для первого принятого сообщения от клиента
        if (con_val) {
            con_val->_connection_id = connection_id;
            connection_values.insert(std::make_pair(connection_id, con_val));
        }
    } else if (lastMessage(iter, msg)) { ///< Вызвать функцию для следующего или последнего принятого сообщения от клиента
        ///< Если сообщение последнее (определятеся логикой переопределённой функции) данные текущего подключения удаляются
        connection_values.erase(iter);
    }
    /// Обновить массив описателей
    std::lock_guard<std::mutex> lock(_mutex);
    _connection_values = connection_values;
}


void Worker::onOpen(size_t connection_id) {
    LOG(DEBUG) << connection_id;
}


void Worker::onError(size_t connection_id, const boost::system::error_code &ec) {
    LOG(ERROR) << connection_id << ", " << ec << ", \"" << ec.message() << "\"";
    deleteConnection(connection_id);
}


void Worker::onClose(size_t connection_id, int status, const std::string &reason) {
    LOG(ERROR) << connection_id << ", " << status << ", \"" << reason << "\"";
    deleteConnection(connection_id);
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


template<class WServer>
class EndpointWrapper {
    typedef std::shared_ptr<typename WServer::Connection> PConnection;
    typedef std::shared_ptr<typename WServer::Message> PMessage;
    typedef typename WServer::Endpoint Endpoint;
    typedef typename WServer::SendStream SendStream;

    WServer *_server;
    Endpoint &_endpoint;
    std::shared_ptr<Worker> _worker;

    /// Отправка сообщения по идентификатору подключения с обработкой ошибок
    /// fin_rsv_opcode: 129=one fragment, text;
    ///                 130=one fragment, binary;
    ///                 136=close connection.
    void sendMessage(size_t connection_id, const std::string &msg, unsigned char fin_rsv_opcode = 129) {
        for(auto connection : _server->get_connections()) {
            if (connection_id == (size_t)connection.get()) {
                if (connection) {
                    //LOG(DEBUG) << "connection_id: " << connection_id << "\"" << msg << "\"";
                    LOG(DEBUG) << "connection_id: " << connection_id;
                    auto send_stream = std::make_shared<SendStream>();
                    std::copy(msg.begin(), msg.end(), std::ostream_iterator<char>(*send_stream));
                    auto sending_error_func = [](const boost::system::error_code &ec) {
                        if (ec) {
                            LOG(ERROR) << ec << ", message: \"" << ec.message() << "\"";
                        }
                    };
                    _server->send(connection, send_stream, sending_error_func, fin_rsv_opcode);
                    break;
                }
            }
        }
    };

    /// Отправка описания ошибки по идентификатору подключения с обработкой ошибок в виде json
    void sendError(size_t connection_id, const std::string &error) {
        std::stringstream ss;
        ss << "{\"error\":\"" << error << "\"}";
        LOG(ERROR) << ss.str();
        sendMessage(connection_id, ss.str());
    };

public:
    EndpointWrapper(WServer *server, const std::string &endpoint_str, const std::shared_ptr<Worker> &worker)
        : _server(server)
        , _endpoint(server->endpoint[endpoint_str]) {
        /// Инициализация функторов отправкли сообщений и сведений об ошибках клиенту
        namespace p = std::placeholders;
        worker->initSendFunctions(std::bind(&EndpointWrapper<WServer>::sendMessage, this, p::_1, p::_2, p::_3),
                                  std::bind(&EndpointWrapper<WServer>::sendError, this, p::_1, p::_2));

        /// Инициализация функторов обработки событий подключения
        _endpoint.onopen = [worker](PConnection connection) {
            worker->onOpen((size_t)connection.get());
        };

        _endpoint.onmessage = [worker](PConnection connection, PMessage message) {
            worker->onMessage((size_t)connection.get(), message->string());
        };

        _endpoint.onerror = [worker](PConnection connection, const boost::system::error_code& ec) {
            worker->onError((size_t)connection.get(), ec);
        };

        _endpoint.onclose = [worker](PConnection connection, int status, const std::string& reason) {
            worker->onClose((size_t)connection.get(), status, reason);
        };
    }
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


template<class WServer>
class WebSocketWrapper
    : public WebSocket
    , public WServer {
    std::map<std::string, std::shared_ptr<EndpointWrapper<WServer>>> _end_points;

public:
    template<class WS = SimpleWeb::SocketServer<SimpleWeb::WS>>
    WebSocketWrapper(int port)
        : SimpleWeb::SocketServer<SimpleWeb::WS>(port, std::thread::hardware_concurrency() + 1)
    {}

    template<class WSS = SimpleWeb::SocketServer<SimpleWeb::WSS>>
    WebSocketWrapper(int port, const std::string &srvcrt, const std::string &srvkey)
        : SimpleWeb::SocketServer<SimpleWeb::WSS>(port, std::thread::hardware_concurrency() + 1, srvcrt, srvkey)
    {}

    virtual bool addEndpoint(const std::string &endpoint_str, const std::shared_ptr<Worker> &worker) {
        auto endpoint = std::make_shared<EndpointWrapper<WServer>>((WServer*)this, endpoint_str, worker);
        auto pair = std::make_pair(endpoint_str, endpoint);
        return _end_points.insert(pair).second;
    }

    virtual void start() {
        WServer::start();
    }
};
} /// webserver
} /// arobot
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

using namespace arobot;
using namespace webserver;


WebSocketServer::WebSocketServer(int port, const std::string &srvcrt, const std::string &srvkey)
    : _socket(std::make_shared<WebSocketWrapper<SimpleWeb::SocketServer<SimpleWeb::WSS>>>(port, srvcrt, srvkey)) {
    LOG(INFO) << "Start: " << port << ", \"" << srvcrt << "\", \"" << srvkey << "\"";
}


WebSocketServer::WebSocketServer(int port)
    : _socket(std::make_shared<WebSocketWrapper<SimpleWeb::SocketServer<SimpleWeb::WS>>>(port)) {
    LOG(INFO) << "Start: " << port;
}


WebSocketServer::~WebSocketServer()
{}


bool WebSocketServer::addEndpoint(const std::string &endpoint_str, const std::shared_ptr<Worker> &worker) {
    LOG(INFO) << "Server endpoint: \"" << endpoint_str << "\"";
    return _socket->addEndpoint(endpoint_str, worker);
}


void WebSocketServer::start() {
    /// Запуск потока обработки соединения
    std::thread thread([this]() {
        _socket->start();
    });
    thread.join();
}
