#include "OperatorTranslatorWorker.hpp"

using namespace arobot::trans;


OperatorTranslatorWorker::OperatorConnectionRoom::~OperatorConnectionRoom() {
    if (_room_controller) {
        _room_controller->deleteFromRoom(_room_id, std::make_tuple(_connection_id, static_cast<size_t>(0)));
    }
}


void OperatorTranslatorWorker::sendToRoom(
        const std::string &room_id, size_t &clnt_id, size_t oper_id, const Json::Value &json) {
    /// Формирование json на отправку
    std::stringstream resp_ss;
    resp_ss << "{\"room_id\":\"" << room_id
            << "\",\"oper_id\":\"" << oper_id
            << "\",\"msg\":";
    if (json["msg"].isString()) {
        resp_ss << "\"" << json["msg"].asString() << "\"}";
    }
    if (json["msg"].isObject() or json["msg"].isArray()) {
        Json::FastWriter fw;
        std::string output = fw.write(json["msg"]);
        resp_ss << output << "}";
    }
    /// Отправка клиенту
    if (clnt_id and oper_id) {
        _msg_func(clnt_id, resp_ss.str(), WS_STRING_MESSAGE);
    }
}


PConnectionValue OperatorTranslatorWorker::firstMessage(size_t connection_id, const std::string &msg) {
    LOG(DEBUG) << "con_id = " << connection_id << "; " << msg;
    POperatorConnectionRoom con_room;
    auto create_func = [&](const std::string &room_id, const Json::Value &json) {
        /// Сохранить параметры комнаты
        con_room = std::make_shared<OperatorConnectionRoom>();
        con_room->_room_id = room_id;
        con_room->_room_controller = _room_controller;
        /// Создать ссылку на комнату и связать с ней идентификатор подключения
        SingleClientRoomMembers room_ch;
        {
            std::lock_guard<std::mutex> lock(_mutex);
            room_ch = _room_controller->addToRoom(room_id, std::make_tuple(static_cast<size_t>(0), connection_id));
        }
        size_t clnt_id = std::get<0>(room_ch);
        LOG(DEBUG) << "room_id: " << room_id << "; {" << clnt_id << "," <<  connection_id << "}";
    };
    parseMessage(msg, create_func);
    if (con_room) {
        LOG(DEBUG) << "room_id: " << con_room->_room_id << "; [" << connection_id << "]";
    }
    return con_room;
}


bool OperatorTranslatorWorker::lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
    size_t connection_id = iter->first;
    LOG(DEBUG) << "conid = " << connection_id << "; " << msg;
    auto send_func = [=](const std::string &room_id, const Json::Value &json) {
        if (not json["msg"].empty() and (json["msg"].isString() or json["msg"].isObject() or json["msg"].isArray())) {
            /// Получить ссылку на комнату и идентификатор подключения
            SingleClientRoomMembers room_ch;
            {
                std::lock_guard<std::mutex> lock(_mutex);
                room_ch = _room_controller->getRoom(room_id);
            }
            size_t clnt_id = std::get<0>(room_ch);
            LOG(DEBUG) << "room_id: " << room_id << "; {" << clnt_id << "," <<  connection_id << "}";
            sendToRoom(room_id, clnt_id, connection_id, json);
        } else {
            LOG(ERROR) << "Can`t find 'msg' tag or incorrect tag type.";
        }
    };
    parseMessage(msg, send_func);
    return false;
}


OperatorTranslatorWorker::OperatorTranslatorWorker(std::mutex &mutex, const PSingleClientRoomController &room_controller)
    : BaseWorker(mutex, room_controller)
{}


OperatorTranslatorWorker::~OperatorTranslatorWorker()
{}
