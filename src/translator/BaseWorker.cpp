#include "BaseWorker.hpp"

using namespace arobot::trans;


void BaseWorker::parseMessage(const std::string &msg, const ConcreteFunc &func) {
    try {
        Json::Value json;
        Json::Reader reader;
        bool res = false;
        {
            std::lock_guard<std::mutex> lock(_mutex);
            res = reader.parse(msg, json);
        };
        if (res) {
            if (json.isObject() and not json["room_id"].empty()) {
                func(json["room_id"].asString(), json);
            } else {
                LOG(ERROR) << "Can`t find value \"room_id\".";
            }
        }
    } catch(std::exception &e) {
        LOG(ERROR) << e.what();
    }
}


BaseWorker::BaseWorker(std::mutex &mutex, const PSingleClientRoomController &room_controller)
    : Worker(mutex)
    , _room_controller(room_controller)
{}


BaseWorker::~BaseWorker()
{}
