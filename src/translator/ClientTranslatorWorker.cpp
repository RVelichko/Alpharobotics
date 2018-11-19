#include <sstream>

#include "ClientTranslatorWorker.hpp"

using namespace arobot::trans;


ClientTranslatorWorker::ClientConnectionRoom::~ClientConnectionRoom() {
    if (_room_controller) {
        _room_controller->deleteFromRoom(_room_id, std::make_tuple(_connection_id, static_cast<size_t>(0)));
    }
}


void ClientTranslatorWorker::sendToRoom(
        const std::string &room_id, size_t clnt_id, const std::set<size_t> &con_ids, const Json::Value &json) {
    /// Формирование json на отправку
    std::stringstream resp_ss;
    resp_ss << "{\"room_id\":\"" << room_id
            << "\",\"clnt_id\":\"" << clnt_id
            << "\",\"msg\":";
    if (json["msg"].isString()) {
        resp_ss << "\"" << json["msg"].asString() << "\"}";
    }
    if (json["msg"].isObject() or json["msg"].isArray()) {
        Json::FastWriter fw;
        std::string output = fw.write(json["msg"]);
        resp_ss << output << "}";
    }
//    LOG(DEBUG) << "oper_size=" << con_ids.size() << "; " << resp_ss.str();
    /// Рассылка операторам
    for (auto con_id : con_ids) {
        if (con_id) {
            LOG(DEBUG) << resp_ss.str();
            _msg_func(con_id, resp_ss.str(), WS_STRING_MESSAGE);
        }
    }
}


PConnectionValue ClientTranslatorWorker::firstMessage(size_t connection_id, const std::string &msg) {
    LOG(DEBUG) << "con_id = " << connection_id << "; " << msg;
    PClientConnectionRoom con_room;
    auto create_func = [&](const std::string &room_id, const Json::Value &json) {
        /// Сохранить параметры комнаты
        con_room = std::make_shared<ClientConnectionRoom>();
        con_room->_room_id = room_id;
        con_room->_room_controller = _room_controller;
        /// Создать ссылку на комнату и связать с ней идентификатор подключения
        SingleClientRoomMembers room_ch;
        {
            std::lock_guard<std::mutex> lock(_mutex);
            room_ch = _room_controller->addToRoom(room_id, std::make_tuple(connection_id, static_cast<size_t>(0)));
        }
        std::set<size_t> operators = std::get<1>(room_ch);
    };
    parseMessage(msg, create_func);
    if (con_room) {
        LOG(DEBUG) << "room_id: " << con_room->_room_id << "; [" << connection_id << "]";
    }
    return con_room;
}


bool ClientTranslatorWorker::lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
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
            std::set<size_t> operators = std::get<1>(room_ch);
            sendToRoom(room_id, connection_id, operators, json);
        } else {
            LOG(ERROR) << "Can`t find 'msg' tag or incorrect tag type.";
        }
    };
    parseMessage(msg, send_func);
    return false;
}


ClientTranslatorWorker::ClientTranslatorWorker(std::mutex &mutex, const PSingleClientRoomController &room_controller)
    : BaseWorker(mutex, room_controller)
{}


ClientTranslatorWorker::~ClientTranslatorWorker()
{}

