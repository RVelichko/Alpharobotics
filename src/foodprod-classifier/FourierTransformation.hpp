/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Выделение спектров картинок.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#pragma once

#include <vector>
#include <string>

#include "Transformation.hpp"

namespace arobot {
namespace fpc {

class FourierTransformation
    : public Transformation {
    std::vector<std::string> _scalars;

    void dft(cv::Mat &img);
    size_t getScalar(cv::Mat &img);

public:
    FourierTransformation(const cv::Mat &in_img);

    std::vector<std::string> getScalars();
};
} /// fpc
} /// arobot
