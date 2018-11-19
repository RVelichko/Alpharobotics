/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Базовый объект трансформации картинки.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#pragma once

#include <random>
#include <string>

#include <opencv2/opencv.hpp>

namespace arobot {
namespace fpc {

class Transformation {
protected:
    cv::Mat _img_result;

    int uniformRand256() {
        std::random_device rd;
        std::mt19937 gen(rd());
        static std::uniform_int_distribution<> dis(0, 255);
        return dis(gen);
    }

public:
    virtual ~Transformation()
    {}

    cv::Mat imgResult() {
        return _img_result;
    }
};
} /// fpc
} /// arobot
