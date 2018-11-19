/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Выделение углов методом Shi - Tomasi.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include <vector>
#include <string>

#include <opencv2/opencv.hpp>

#include "ShiTomasiCornerDetectionTransformation.hpp"
#include "Log.hpp"

using namespace arobot;
using namespace fpc;


ShiTomasiCornerDetectionTransformation::ShiTomasiCornerDetectionTransformation(const cv::Mat &src) {
    LOG(DEBUG);
    cv::Mat src_gray;
    cv::cvtColor(src, src_gray, CV_BGR2GRAY);
    cv::Mat copy = cv::Mat::zeros(src_gray.size(), CV_8UC3);
    int maxCorners = 1024;
    /// Парамтры для алгоритма Shi-Tomasi
    std::vector<cv::Point2f> corners;
    double qualityLevel = 0.01;
    double minDistance = 10;
    int blockSize = 3;
    bool useHarrisDetector = false;
    double k = 0.04;
    cv::goodFeaturesToTrack(src_gray, corners, maxCorners, qualityLevel, minDistance,  cv::Mat(), blockSize,
                            useHarrisDetector, k);
    int r = 4;
    cv::Point2f centr_pt(src.rows / 2, src.cols / 2);
    cv::Point2f base_pt(1, 1);
    for (size_t i = 0; i < corners.size(); ++i) {
        cv::Scalar color = cv::Scalar(uniformRand256(), uniformRand256(), uniformRand256());
        cv::Point2f cpt = corners[i];
        cv::circle(copy, cpt, r, color);
        int64_t fib_ddot = _fr.reduction(static_cast<int64_t>(std::floor(cpt.ddot(base_pt))));
        double cross = cpt.cross(base_pt);
        int64_t fib_cross;
        if (cross < 0) {
            fib_cross = -static_cast<int64_t>(_fr.reduction(static_cast<int64_t>(std::floor(-cross))));
        } else {
            fib_cross = static_cast<int64_t>(_fr.reduction(static_cast<int64_t>(std::floor(cross))));
        }
        _scalars.push_back("dd" + std::to_string(fib_ddot));
        _scalars.push_back("crs" + std::to_string(fib_cross));
        size_t vlen = _fr.reduction(static_cast<int64_t>(std::floor(cv::norm(cpt - centr_pt) + 0.5)));
        _scalars.push_back("vlen" + std::to_string(vlen));
    }

    if (not copy.empty()) {
        _img_result = copy.clone();
    }
}


std::vector<std::string> ShiTomasiCornerDetectionTransformation::getScalars() {
    return _scalars;
}
