/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Выделение углов методом Shi - Tomasi.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#pragma once

#include <vector>
#include <string>

#include "FibonacciReduction.hpp"
#include "Transformation.hpp"

namespace arobot {
namespace fpc {

class ShiTomasiCornerDetectionTransformation
    : public Transformation {
    utils::FibonacciReduction _fr;
    std::vector<std::string> _scalars;

public:
    ShiTomasiCornerDetectionTransformation(const cv::Mat &in_img);

    std::vector<std::string> getScalars();
};
} /// fpc
} /// arobot
