/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Обработчик запросов от оператора.
 * \author Величко Ростислав
 * \date   23.01.2017
 */

#pragma once

#include <mutex>
#include <functional>
#include <string>
#include <memory>

#include <json/json.h>

#include "Log.hpp"
#include "Timer.hpp"
#include "RoomController.hpp"
#include "WebSocketServer.hpp"

namespace arobot {
namespace trans {

struct NullDataType
{};

typedef utils::RoomData<NullDataType> RoomNullData;
typedef typename RoomNullData::SingleRobotMembers SingleClientRoomMembers;
typedef utils::RoomController<NullDataType, SingleClientRoomMembers> SingleClientRoomController;
typedef std::shared_ptr<SingleClientRoomController> PSingleClientRoomController;

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
    std::string _room_id;                         ///< Идентификатор комнаты
    PSingleClientRoomController _room_controller; ///< Контроллер комнаты нужен для удаления идентификатора подключения из комнаты
};


class BaseWorker
    : public Worker {
protected:
    typedef std::function<void(const std::string&, const Json::Value&)> ConcreteFunc;

    PSingleClientRoomController _room_controller;

    void parseMessage(const std::string &msg, const ConcreteFunc &func);

public:
    BaseWorker(std::mutex &mutex, const PSingleClientRoomController &room_controller);
    virtual ~BaseWorker();
};
} // trans
} // arobot
