/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Модель данных классификатора картинок на основе алгоритма "наивный Баес".
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include <fstream>
#include <cmath>
#include <limits>

#include "Log.hpp"
#include "NbClassifierModel.hpp"

using namespace arobot;
using namespace fpc;


NbClassifierModel::NbClassifierModel()
{}


NbClassifierModel::~NbClassifierModel()
{}


void NbClassifierModel::serialise(std::ostream &os) {
    std::lock_guard<std::mutex> lock(_mutex);
    boost::archive::text_oarchive oa(os);
    oa << _a_serialiser;
    oa << _b_serialiser;
}


void NbClassifierModel::deserialise(std::istream &is) {
    std::lock_guard<std::mutex> lock(_mutex);
    boost::archive::text_iarchive ia(is);
    ia >> _a_serialiser;
    ia >> _b_serialiser;
}


size_t NbClassifierModel::addObject(CatType cat_type, const std::vector<std::string> &scalars) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto add_func = [scalars](size_t &class_count, size_t &sum_count, ScalarsCounts &a, ScalarsCounts &b) {
        ++class_count;
        for (const auto &scalar : scalars) {
            auto scalar_count_it = a.find(scalar);
            if (scalar_count_it not_eq a.end()) {
                ++scalar_count_it->second;
            } else {
                a.insert(std::make_pair(scalar, 1));
                b.insert(std::make_pair(scalar, 0));
            }
            ++sum_count;
        }
    };
    size_t count = 0;
    if (cat_type == CatType::FIRST) {
        add_func(_a_serialiser._obj_count, _a_serialiser._sum_scalars_count, _a_serialiser._scalars_counts,
                 _b_serialiser._scalars_counts);
        count = _a_serialiser._obj_count;
    } else if (cat_type == CatType::SECOND) {
        add_func(_b_serialiser._obj_count, _b_serialiser._sum_scalars_count, _b_serialiser._scalars_counts,
                 _a_serialiser._scalars_counts);
        count = _b_serialiser._obj_count;
    }
    LOG(DEBUG) << static_cast<size_t>(cat_type) << " : " << count;
    return count;
}


std::pair<long double, long double> NbClassifierModel::objsProb() {
    std::lock_guard<std::mutex> lock(_mutex);
    long double all_obj_count = static_cast<long double>(_a_serialiser._obj_count + _b_serialiser._obj_count);
    long double a = static_cast<long double>(_a_serialiser._obj_count) / all_obj_count;
    long double b = static_cast<long double>(_b_serialiser._obj_count) / all_obj_count;
    return std::make_pair(std::log10(a) ,std::log10(b));
}


std::pair<long double, long double> NbClassifierModel::scalarProb(const std::string &scalar) {
    std::lock_guard<std::mutex> lock(_mutex);
    auto count_func = [scalar](const ScalarsCounts &scalars) {
        auto scalar_count_it = scalars.find(scalar);
        size_t count = 0;
        if (scalar_count_it not_eq scalars.end()) {
            count = scalar_count_it->second;
        }
        return count;
    };
    if (_a_serialiser._scalars_counts.size() not_eq _b_serialiser._scalars_counts.size()) {
        LOG(ERROR) << "Can`t classify: sizes of categories tables need equivakent. "
                   <<"Current: A.size=" << _a_serialiser._scalars_counts.size()
                   << "; B.size=" << _b_serialiser._scalars_counts.size();
    } else {
        /// Получить количестко скаляров в отдельной категории + уникальное количество скаляров во всех категориях
        size_t al = _a_serialiser._sum_scalars_count + _a_serialiser._scalars_counts.size();
        size_t bl = _b_serialiser._sum_scalars_count + _b_serialiser._scalars_counts.size();
        /// Вычислить вероятности скаляра для категорий
        long double a = static_cast<long double>(count_func(_a_serialiser._scalars_counts) + 1.0) / static_cast<long double>(al);
        long double b = static_cast<long double>(count_func(_b_serialiser._scalars_counts) + 1.0) / static_cast<long double>(bl);
        return std::make_pair(std::log10(a), std::log10(b));
    }
    return std::make_pair(0, 0);
}
