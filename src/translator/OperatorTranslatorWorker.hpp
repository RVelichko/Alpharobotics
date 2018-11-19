/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Обработчик запросов от оператора.
 * \author Величко Ростислав
 * \date   23.01.2017
 */

#pragma once

#include "BaseWorker.hpp"

namespace arobot {
namespace trans {


class OperatorTranslatorWorker
    : public BaseWorker {
    struct OperatorConnectionRoom
        : public ConnectionRoom {
        virtual ~OperatorConnectionRoom();
    };
    typedef std::shared_ptr<OperatorConnectionRoom> POperatorConnectionRoom;

    /**
     * Отправка сообщения операторам комнаты
     *
     * \param room_id Идентификатор комнаты
     * \param clnt_id Идентификатор клиента
     * \param oper_id Идентификатор оператора
     * \param json    Транслируемый json
     */
    void sendToRoom(const std::string &room_id, size_t &clnt_id, size_t oper_id, const Json::Value &json);

    virtual PConnectionValue firstMessage(size_t connection_id, const std::string &msg);
    virtual bool lastMessage(const ConnectionValuesIter &iter, const std::string &msg);

public:
    OperatorTranslatorWorker(std::mutex &mutex, const PSingleClientRoomController &room_controller);
    virtual ~OperatorTranslatorWorker();
};
} // trans
} // arobot
