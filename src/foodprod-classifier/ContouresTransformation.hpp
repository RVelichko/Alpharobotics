/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Преобразование с выделением контуров.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#pragma once

#include <string>
#include <vector>

#include "FibonacciReduction.hpp"
#include "Transformation.hpp"

namespace arobot {
namespace fpc {

class ContouresTransformation
    : public Transformation {
    std::vector<std::string> _scalars;
    utils::FibonacciReduction _fr;

public:
    ContouresTransformation(const cv::Mat &in_img);

    std::vector<std::string> getScalars();
};
} /// fpc
} /// arobot
