/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Классификатор картинок на основе алгоритма "наивный Баес".
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include "Log.hpp"
#include "NbClassifier.hpp"

using namespace arobot;
using namespace fpc;

NbClassifier::NbClassifier(std::shared_ptr<NbClassifierModel> &model)
    : _model(model)
{}


NbClassifierModel::CatType NbClassifier::classify(const std::vector<std::string> &scalars) {
    /// Учесть log вероятности объектов в категории
    auto probs = _model->objsProb();
    /// Подсчитать вероятности скалярных величин для каждой категории
    for (const auto &scalar : scalars) {
        auto scalar_probs = _model->scalarProb(scalar);
        probs.first  += scalar_probs.first;  /// Фасованное значение
        probs.second += scalar_probs.second; /// Не Фасованное значение
    }
    if (probs.first < probs.second) {
        LOG(DEBUG) << "WEIGHT_OUT";
        return NbClassifierModel::CatType::SECOND;
    }
    LOG(DEBUG) << "PACKED";
    return NbClassifierModel::CatType::FIRST;
}
