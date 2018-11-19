/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Преобразование с выделением наиболее значимых цветов.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#pragma once

#include <vector>
#include "Transformation.hpp"

namespace arobot {
namespace fpc {


class ColorsTransformation
    : public Transformation {
    std::vector<std::string> _scalars;

public:
    ColorsTransformation(const cv::Mat &in_img);

    std::vector<std::string> getScalars();
};
} /// fpc
} /// arobot
