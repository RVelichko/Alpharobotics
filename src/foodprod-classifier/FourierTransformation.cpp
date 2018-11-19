/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Выделение спектров картинок.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include <vector>
#include <string>
#include <bitset>

#include "FourierTransformation.hpp"
#include "Log.hpp"

#define IMG_PIXS 34

using namespace arobot;
using namespace fpc;


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


void FourierTransformation::dft(cv::Mat &img) {
    int M = cv::getOptimalDFTSize(img.rows);
    int N = cv::getOptimalDFTSize(img.cols);
    cv::Mat padded;
    cv::copyMakeBorder(img, padded, 0, M - img.rows, 0, N - img.cols, cv::BORDER_CONSTANT, cv::Scalar::all(0));

    cv::Mat planes[] = {
        cv::Mat_<float>(padded), cv::Mat::zeros(padded.size(), CV_32F)
    };
    cv::Mat complex_img;
    cv::merge(planes, 2, complex_img);

    cv::dft(complex_img, complex_img);

    /// compute log(1 + sqrt(Re(DFT(img))**2 + Im(DFT(img))**2))
    cv::split(complex_img, planes);
    cv::magnitude(planes[0], planes[1], planes[0]);
    cv::Mat mag = planes[0];
    mag += cv::Scalar::all(1);
    cv::log(mag, mag);

    /// crop the spectrum, if it has an odd number of rows or columns
    mag = mag(cv::Rect(0, 0, mag.cols & -2, mag.rows & -2));

    int cx = mag.cols/2;
    int cy = mag.rows/2;

    /// rearrange the quadrants of Fourier image so that the origin is at the image center
    cv::Mat tmp;
    cv::Mat q0(mag, cv::Rect(0, 0, cx, cy));
    cv::Mat q1(mag, cv::Rect(cx, 0, cx, cy));
    cv::Mat q2(mag, cv::Rect(0, cy, cx, cy));
    cv::Mat q3(mag, cv::Rect(cx, cy, cx, cy));

    q0.copyTo(tmp);
    q3.copyTo(q0);
    tmp.copyTo(q3);

    q1.copyTo(tmp);
    q2.copyTo(q1);
    tmp.copyTo(q2);

    cv::normalize(mag, mag, 0, 1, CV_MINMAX);
    cv::normalize(mag, mag, 0, 255, CV_MINMAX);
    mag.copyTo(img);
}


size_t FourierTransformation::getScalar(cv::Mat &img) {
    size_t w = img.cols / 4;
    size_t h = img.rows / 3;
    std::bitset<12> bs;
    for(int i = 0; i < 4; ++i) {
        for(int j = 0; j < 3; ++j) {
            cv::Mat m = cv::Mat(img, cv::Rect(i * w, j * h, w, h));
            int32_t count = 0;
            for(int x = 0; x < m.rows; ++x) {
                for(int y = 0; y < m.cols; ++y) {
                    if (128 < m.at<uchar>(x, y)) {
                        ++count;
                    } else {
                        --count;
                    }
                }
            }
            if (count < 0) {
                bs[j * w + i] = false;
            } else {
                bs[j * w + i] = true;
            }
        }
    }
    return bs.to_ulong();
}


FourierTransformation::FourierTransformation(const cv::Mat &in_img) {
    LOG(DEBUG);
    cv::Mat img2;
    cv::cvtColor(in_img, img2, CV_BGR2GRAY);
    //size_t r = (img2.rows < img2.cols ? img2.rows : img2.cols) / IMG_PIXS;
    if (not img2.empty()) {
        cv::Mat drawing = cv::Mat::zeros(img2.size(), CV_8UC3);
        for(int i = 0; i < (img2.rows / IMG_PIXS); ++i) {
            for(int j = 0; j < (img2.cols / IMG_PIXS); ++j) {
                cv::Mat img = cv::Mat(img2, cv::Rect(j * IMG_PIXS, i * IMG_PIXS, IMG_PIXS, IMG_PIXS));
                dft(img);
                RGBAColor col;
                col.index = getScalar(img);
                _scalars.push_back("f" + std::to_string(col.index));
                cv::Point2f pt((i * IMG_PIXS) + (IMG_PIXS / 2), (j * IMG_PIXS) + (IMG_PIXS / 2));
                cv::Scalar s = cv::Scalar(col.rgba.r, col.rgba.g, col.rgba.b);
                cv::circle(drawing, pt, (IMG_PIXS / 2) - 3, s, -1);
            }
        }
        if (not img2.empty()) {
            _img_result = drawing.clone();
        }
    }
}


std::vector<std::string> FourierTransformation::getScalars() {
    return _scalars;
}
