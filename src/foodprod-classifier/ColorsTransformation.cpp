/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Преобразование с выделением наиболее значимых цветов.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include <vector>
#include <algorithm>
#include <cmath>

#include "Log.hpp"
#include "ColorsTransformation.hpp"

using namespace arobot;
using namespace fpc;


#define COLOR_PARTS 8

/**
* \brief Объединение структуры компонент цвета с 4 байтовым числом
*/
union RGBAColor {
    uint32_t index;
    struct {
        uint8_t a;
        uint8_t r;
        uint8_t g;
        uint8_t b;
    } rgba;
};


/**
* \brief Метод конвертации цветовых компонет к меньшей градации
*
* \param col Объект - объединения с данными компонент цвета.
*/
RGBAColor convert(RGBAColor col) {
    auto cf = [](uint8_t val) {
        if (val) {
            uint8_t step = static_cast<uint8_t>(std::floor((static_cast<double>(256) / static_cast<double>(COLOR_PARTS)) + 0.5));
            val = static_cast<uint8_t>(std::floor(static_cast<double>(val) / static_cast<double>(step))) * step;
        }
        return val;
    };
    col.rgba.a = 0;
    col.rgba.r = cf(col.rgba.r);
    col.rgba.g = cf(col.rgba.g);
    col.rgba.b = cf(col.rgba.b);
    return col;
}


ColorsTransformation::ColorsTransformation(const cv::Mat &image) {
    LOG(DEBUG);
    /// для хранения RGB-х цветов
    cv::Mat dst = image.clone();
    cv::Mat color_indexes = cv::Mat(image.rows, image.cols, CV_8UC(1), cv::Scalar::all(0));
    cv::Mat drawing = image.clone();
    std::map<uint32_t, size_t> colors_counts;
    for (int x = 0; x < image.rows; ++x) {
        for (int y = 0; y < image.cols; ++y) {
            cv::Vec3b image_vec = image.at<cv::Vec3b>(x, y);
            RGBAColor c;
            c.rgba.r = image_vec.val[0];
            c.rgba.g = image_vec.val[1];
            c.rgba.b = image_vec.val[2];
            c.rgba.a = 0;
            RGBAColor convc = convert(c);
            cv::Vec3b &drawing_vec = drawing.at<cv::Vec3b>(x, y);
            /// Нарисовать скаляр
            drawing_vec[0] = convc.rgba.r;
            drawing_vec[1] = convc.rgba.g;
            drawing_vec[2] = convc.rgba.b;
            /// Добавить очередной скалаяр в масси
            _scalars.push_back(std::to_string(convc.index));
        }
    }
    if (not drawing.empty()) {
        _img_result = drawing.clone();
    }
}


std::vector<std::string> ColorsTransformation::getScalars() {
    return _scalars;
}
