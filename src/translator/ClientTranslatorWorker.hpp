/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Обработчик запросов от клиента.
 * \author Величко Ростислав
 * \date   23.01.2017
 */

#pragma once

#include "BaseWorker.hpp"

namespace arobot {
namespace trans {


class ClientTranslatorWorker
    : public BaseWorker {
    struct ClientConnectionRoom
        : public ConnectionRoom {
        virtual ~ClientConnectionRoom();
    };
    typedef std::shared_ptr<ClientConnectionRoom> PClientConnectionRoom;

    /**
     * Отправка сообщения операторам комнаты
     *
     * \param room_id Идентификатор комнаты
     * \param clnt_id Идентификатор клиента
     * \param con_ids Идентификаторы операторов
     * \param json    Транслируемый json
     */
    void sendToRoom(const std::string &room_id, size_t clnt_id, const std::set<size_t> &con_ids, const Json::Value &json);

    virtual PConnectionValue firstMessage(size_t connection_id, const std::string &msg);
    virtual bool lastMessage(const ConnectionValuesIter &iter, const std::string &msg);

public:
    ClientTranslatorWorker(std::mutex &mutex, const PSingleClientRoomController &room_controller);
    virtual ~ClientTranslatorWorker();
};
} // trans
} // arobot
