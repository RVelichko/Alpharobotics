/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Классификатор картинок на основе алгоритма "наивный Баес".
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#pragma once

#include <memory>
#include <string>
#include <vector>

#include "NbClassifierModel.hpp"

namespace arobot {
namespace fpc {

class NbClassifier {
    std::shared_ptr<NbClassifierModel> _model;

public:
    explicit NbClassifier(std::shared_ptr<NbClassifierModel> &model);
    NbClassifierModel::CatType classify(const std::vector<std::string> &scalars);
};
} /// fpc
} /// arobot
