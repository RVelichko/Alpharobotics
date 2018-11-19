/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Обработчик принятых соединений для добавления передаваемых картинок в базу классификатора.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#pragma once

#include <string>
#include <memory>

#include "BaseClassifierWorker.hpp"
#include "NbClassifierModel.hpp"

namespace arobot {
namespace fpc {

class AddFoodprodClassifierWorker
    : public BaseClassifierWorker {
    std::shared_ptr<NbClassifierModel> _nbc_model;
    std::string _model_file_name;

public:
    /**
    * \brief Конструктор объекта расширения модели классификаии
    *
    * \param mutex           Доступ к объектам сети требует единого уникального доступа.
    * \param model_file_name Имя файла, содержащего модель классификатора.
    */
    explicit AddFoodprodClassifierWorker(std::mutex &mutex,
                                         const std::shared_ptr<NbClassifierModel> &nbc_model,
                                         const std::string &model_file_name);
    virtual ~AddFoodprodClassifierWorker();

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
