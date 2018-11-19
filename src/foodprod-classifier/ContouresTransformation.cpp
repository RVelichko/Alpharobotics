/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Преобразование с выделением контуров.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include "Log.hpp"
#include "ContouresTransformation.hpp"

using namespace arobot;
using namespace fpc;


ContouresTransformation::ContouresTransformation(const cv::Mat &img_col) {
    LOG(DEBUG);
    cv::Mat img_gray;
    cv::cvtColor(img_col, img_gray, CV_BGR2GRAY);
    cv::blur(img_gray, img_gray, cv::Size(3, 3));

    cv::Mat canny_output;
    std::vector<std::vector<cv::Point>> contours;
    std::vector<cv::Vec4i> hierarchy;

    int thresh = 100;
    cv::Canny(img_gray, canny_output, thresh, thresh * 2, 3);
    cv::findContours(canny_output, contours, hierarchy, CV_RETR_TREE, CV_CHAIN_APPROX_SIMPLE, cv::Point(0, 0));

    cv::Mat drawing = cv::Mat::zeros(canny_output.size(), CV_8UC3);
    std::srand(std::time(nullptr));
    for (size_t i = 0; i < contours.size(); ++i) {
        /// Выделить скаляр
        if(cv::isContourConvex(contours[i])) {
            _scalars.push_back("cc");
        } else {
            _scalars.push_back("ucc");
        }
        //cv::Scalar color = cv::Scalar(0, 0, 0);
        cv::Scalar color = cv::Scalar(uniformRand256(), uniformRand256(), uniformRand256());
        cv::drawContours(drawing, contours, i, color, 1, 8, hierarchy, 0, cv::Point());
        _scalars.push_back("prmtr" + std::to_string(_fr.reduction(contours[i].size())));
        /// Выделить момент
        cv::Moments m = cv::moments(contours[i]);
        _scalars.push_back("mm" + std::to_string(_fr.reduction(static_cast<size_t>(std::floor(m.m00 + 0.5)))));
    }
    if (not drawing.empty()) {
        _img_result = drawing.clone();
    }
}


std::vector<std::string> ContouresTransformation::getScalars() {
    return _scalars;
}
