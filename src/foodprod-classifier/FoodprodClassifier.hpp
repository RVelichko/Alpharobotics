/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Обработчик картинок с продуктовыми товарами.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#pragma once

#include <string>
#include <vector>
#include <memory>

#include <opencv2/opencv.hpp>

#include "NbClassifier.hpp"
#include "Transformation.hpp"

namespace arobot {
namespace fpc {

class FoodprodClassifier {
    std::shared_ptr<Transformation> _transform;
    std::shared_ptr<NbClassifier> _nb_classifier;
    std::vector<std::string> _scalars;
    std::string _json_result;
    std::string _img_buf_result;

public:
    explicit FoodprodClassifier(const std::vector<char> &img, bool is_img_res = true);

    std::string imgResult();
    std::vector<std::string> getScalars();
};
} /// fpc
} /// arobot

