/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Реализация шаблонных объектов для ускорения сборки.
 * \author Величко Ростислав
 * \date   01.27.2016
 */

#pragma once

/// # openssl genrsa -des3 -out sert.key 1024
/// # openssl req -new -key sert.key -out sert.csr
/// # openssl x509 -req -days 365 -in sert.csr -signkey sert.key -out sert.crt

#include <functional>
#include <string>
#include <memory>

#include "server_wss.hpp"

#define WS_STRING_MESSAGE 129
#define WS_BINARY_MESSAGE 130

namespace arobot {
namespace webserver {

/**
 *  Тип объекта, содержащего метод отправки клиенту сообщения
 *
 * \param "size_t",            Идентификатор подключения
 * \param "const std::string&" Сообщение или данные в строковом объекте
 * \param "unsigned char"      Идентификатор типа данных ws канала:
 *                             fin_rsv_opcode: 129 => one fragment, text;
 *                                             130 => one fragment, binary;
 *                                             136 => close connection.
 */
typedef std::function<void(size_t, const std::string&, unsigned char)> SendMsgFunc;

/**
 *  Тип объекта, содержащего метод отправки клиенту сообщения об ошибке
 *
 * \param "size_t",            Идентификатор подключения
 * \param "const std::string&" Строка - сообщение с информацией об ошибке
 */
typedef std::function<void(size_t, const std::string&)> SendErrFunc;

/**
 *  Базовая структура, содержащая идентификатор и возможные, необходимые или промежуточные данные подключения
 */
struct ConnectionValue {
    virtual ~ConnectionValue()
    {}
    size_t _connection_id;
};

typedef std::shared_ptr<ConnectionValue> PConnectionValue;
typedef std::map<size_t, PConnectionValue> ConnectionValues; ///< Ассоциативный массив структур идентификаторов и данных, обрабатываемых подключений
typedef ConnectionValues::iterator ConnectionValuesIter;


/**
 *  Класс - обёртка для инициализации типизированных методов отправки сообщений и сообщениий об ошибках
 */
class SendWrapper {
protected:
    SendMsgFunc _msg_func; ///< Вызывается в обёртке обработчика точки подключения для отправки сообщений из наследника воркера
    SendErrFunc _err_func; ///< Вызывается в обёртке обработчика точки подключения для отправки сообщений об ошибке из наследника воркера

public:
    virtual ~SendWrapper();

    /**
     *  Метод инициализации типизированных функций отправки сообщений и информации об ошибке клиенту
     *
     * \param snd_msg_func  Функтор для метода оправки сообщение
     * \param snd_err_func  Функтор для метода оправки сообщение об ошибке
     */
    virtual void initSendFunctions(const SendMsgFunc &snd_msg_func, const SendErrFunc &snd_err_func);
};


/**
 *  Базовый класс - обработчика конкретного подключения
 */
class Worker
    : public SendWrapper {

    /**
     *  Метод вызывается 1 раз при приёме первого сообщения от клиента
     *
     * \param connection_id  Идентификатор нового подключения
     * \param msg            Перое сообщение
     */
    virtual PConnectionValue firstMessage(size_t connection_id, const std::string &msg);

    /**
     *  Метод вызывается при приёме всех сообщений кроме первого для конкретного клиента
     *
     * \param iter Итератор с данными подключения конкретного клиента
     * \param msg  Очередное сообщение или часть сообщения от клиента
     */
    virtual bool lastMessage(const ConnectionValuesIter &iter, const std::string &msg);

protected:
    std::mutex &_mutex; ///< Внешний объект синхронизации, требуемый для совместной работы нескольких воркеров
    ConnectionValues _connection_values; ///< Массив описателей подключений воркера

    /**
     *  Метод корректного удаления структуры, описывающей подключение при завершении с ним работы
     *
     * \param connection_id  Идентификатор нового подключения
     */
    void deleteConnection(size_t connection_id);

public:
    explicit Worker(std::mutex &mutex);
    virtual ~Worker();

    virtual void onMessage(size_t connection_id, const std::string &msg);
    virtual void onOpen(size_t connection_id);
    virtual void onError(size_t connection_id, const boost::system::error_code& ec);
    virtual void onClose(size_t connection_id, int status, const std::string& reason);
};


/**
 *  Класс - обёртка для функций простого сервера или сервера с SSL
 */
class WebSocket {
public:
    virtual ~WebSocket()
    {}

    virtual bool addEndpoint(const std::string &endpoint_str, const std::shared_ptr<Worker> &worker) = 0;
    virtual void start() = 0;
};


/**
 *  Класс, выполняющий общие функции обслуживания websocket - а
 */
class WebSocketServer {
    std::shared_ptr<WebSocket> _socket;

public:
    /**
     *  Конструктор реализации простого сервера
     *
     * \param port  Порт для подключениея по websocket
     */
    WebSocketServer(int port);

    /**
     *  Конструктор реализации сервера с SSL
     *
     * \param port   Порт для подключениея по websocket
     * \param srvcrt SSL ыертификат
     * \param srvkey SSL ключь
     */
    WebSocketServer(int port, const std::string &srvcrt, const std::string &srvkey);
    virtual ~WebSocketServer();

    /**
     *  Метод добавления имени конечной точки побключения по websocket
     *
     * \param endpoint_str Имя точки подключения
     * \param worker       Объект - обработчик событий текущего подключения
     */
    bool addEndpoint(const std::string& endpoint_str, const std::shared_ptr<Worker> &worker);

    /**
     *  Запуск предварительно настроенного сервера
     */
    void start();
};


/**
 * Шаблонный Класс, реализующий полный функционал обслуживания соединений для переданных воркеров
 * в качестве варьируемого списка шаблонных аргументов
 */
class WSServer
    : public std::enable_shared_from_this<WSServer>
    , private boost::noncopyable {
    typedef std::shared_ptr<WebSocketServer> PWebSocketServer;
    typedef std::pair<std::string, std::shared_ptr<Worker>> WorkerPoint;

public:
    /**
     *  Конструктор итоговой инициализации сервера
     *
     * \param port     Порт сервера
     * \param srvcrt   Не обязательный путь до файла сертификата SSL режима работы
     * \param srvkey   Не обязательный путь до файла ключа SSL режима работы
     * \param tworkers Переменная варьируемого списка шаблонных аргументов
     */
    template<class ... TWorkers>
    WSServer(int port, const std::string &srvcrt, const std::string &srvkey, const TWorkers&... tworkers) {
        /// Инициализация web сервера
        PWebSocketServer server;
        if (not srvcrt.empty() and not srvkey.empty()) {
            server = std::make_shared<WebSocketServer>(port, srvcrt, srvkey);
        } else {
            server = std::make_shared<WebSocketServer>(port);
        }
        /// Добавление REST воркеров на обсуживание в сервер
        WorkerPoint wps[sizeof...(tworkers)] = {tworkers...};
        for (auto wp : wps) {
            server->addEndpoint(wp.first, wp.second);
        }
        /// Запуск сервиса
        server->start();
    }
};
} /// webserver
} /// arobot
