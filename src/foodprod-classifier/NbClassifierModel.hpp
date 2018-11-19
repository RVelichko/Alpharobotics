/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Модель данных классификатора картинок на основе алгоритма "наивный Баес".
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <mutex>

#include <boost/archive/text_oarchive.hpp>
#include <boost/archive/text_iarchive.hpp>
#include <boost/serialization/map.hpp>
#include <boost/serialization/string.hpp>
#include <boost/serialization/serialization.hpp>
#include <boost/noncopyable.hpp>

#pragma once

namespace arobot {
namespace fpc {

class NbClassifierModel
    : boost::noncopyable {
public:
    /**
     * \brief Описание типов категорий
     */
    enum class CatType {
        FIRST,
        SECOND
    };

private:
    /**
     * \brief Тип множества счётчиков скалярной величины, имя - уникально, счётчик - число вхождений
     */
    typedef std::map<std::string, size_t> ScalarsCounts;

    /**
     * \brief Структура категори, содержащая вероятностные у уточняющие значения
     */
    struct CategoryProbs {
        size_t _obj_count = 0;         ///< Количество объектов категории D|c
        size_t _sum_scalars_count = 0; ///< Количество объектов категории L|c
        ScalarsCounts _scalars_counts; ///< Скаляры и их количество W|c

    private:
        friend class boost::serialization::access;

        /**
         * \brief Метод сериализации посредствам boost serialize
         */
        template<class Archive>
        void serialize(Archive& ar, const unsigned int version) {
          ar & _obj_count;
          ar & _sum_scalars_count;
          ar & _scalars_counts;
        }
    };

    std::mutex _mutex;            ///< При многопоточной работе с моделью данных необходим уникальный доступ к модели
    CategoryProbs _a_serialiser;  ///< Сериализатор модели данных для первой категории объектов
    CategoryProbs _b_serialiser;  ///< Сериализатор модели данных для второй категории объектов

public:
    NbClassifierModel();
    virtual ~NbClassifierModel();

    /**
    * \brief Метод заполняющий переданный стрим данными
    *
    * \param os  Стрим, содержащий поток данных для сериализации.
    */
    void serialise(std::ostream &os);

    /**
    * \brief Метод выполняющий десериализацию
    *
    * \param is  Стрим, содержащий поток данных для сериализации.
    */
    void deserialise(std::istream &is);

    /**
    * \brief Метод добавления объекта с модель классификачии
    *
    * \param cat_type Тип категории добавляемого множества салярных величин.
    * \param scalars  Множество скалярных величин объекта.
    * \return Количество добавленных объектов категории.
    */
    size_t addObject(CatType cat_type, const std::vector<std::string> &scalars);

    /**
    * \brief Метод возвращающий вероятности встречаемости объектов для каждой категории из обфщего множества объектов
    */
    std::pair<long double, long double> objsProb();

    /**
    * \brief Метод возвращающий вероятность встречаемости скаляра для каждой категории
    *
    * \param scalar Скалярная величина объекта.
    */
    std::pair<long double, long double> scalarProb(const std::string &scalar);
};
} /// fpc
} /// arobot
