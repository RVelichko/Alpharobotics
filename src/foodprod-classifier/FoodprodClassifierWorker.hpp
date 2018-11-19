/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Обработчик принятых соединений для обработки передаваемых картинок на классификацию.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#pragma once

#include <string>
#include <mutex>
#include <memory>

#include "BaseClassifierWorker.hpp"
#include "FoodprodClassifier.hpp"

namespace arobot {
namespace fpc {

class FoodprodClassifierWorker
    : public BaseClassifierWorker {
protected:
    std::shared_ptr<NbClassifier> _nbc;

public:
    explicit FoodprodClassifierWorker(std::mutex &mutex, std::shared_ptr<NbClassifier> &nbc);
    virtual ~FoodprodClassifierWorker();

    /**
     * \brief Метод инициализации приёма новой картинки на обработку
     *
     * \param connection_id Идентификатор подключения.
     * \param msg           Данные от клиента в строковом виде.
     */
    virtual webserver::PConnectionValue firstMessage(size_t connection_id, const std::string &msg);

    /**
     * \brief Метод приёма картинки и обработки при полностью принятом файле
     *
     * \param iter Структура с информацией о текущем подключении.
     * \param msg  Данные от клиента в строковом виде.
     */
    virtual bool lastMessage(const webserver::ConnectionValuesIter &iter, const std::string &msg);
};
} /// fpc
} /// arobot
