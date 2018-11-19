/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Обработчик картинок с продуктовыми товарами.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include <algorithm>
#include <vector>
#include <cstdlib>
#include <ctime>

//#include <opencv2/core/core.hpp>
//#include <opencv2/imgproc/imgproc.hpp>
//#include <opencv2/highgui/highgui.hpp>
#include <opencv2/opencv.hpp>

#include "Log.hpp"
#include "ColorsTransformation.hpp"
#include "ContouresTransformation.hpp"
#include "FourierTransformation.hpp"
#include "ShiTomasiCornerDetectionTransformation.hpp"
#include "FoodprodClassifier.hpp"

using namespace arobot;
using namespace fpc;

typedef std::shared_ptr<ColorsTransformation> PColorsTransformation;
typedef std::shared_ptr<ContouresTransformation> PContouresTransformation;
typedef std::shared_ptr<ShiTomasiCornerDetectionTransformation> PShiTomasiCornerDetectionTransformation;
typedef std::shared_ptr<FourierTransformation> PFourierTransformation;

FoodprodClassifier::FoodprodClassifier(const std::vector<char> &img_str, bool is_img_res) {
    LOG(DEBUG) << "Image size: " << img_str.size();
    std::vector<unsigned char> data(img_str.size());
    std::copy(img_str.begin(), img_str.end(), data.begin());
    cv::Mat in_img = cv::imdecode(cv::Mat(data), CV_LOAD_IMAGE_COLOR);

    /// Получить скаляры цвета
    PColorsTransformation color_trans = std::make_shared<ColorsTransformation>(in_img);
    _scalars = color_trans->getScalars();

    /// Получить скаляры контуров
    PContouresTransformation cont_trans = std::make_shared<ContouresTransformation>(in_img);
    auto cont_scals = cont_trans->getScalars();
    _scalars.insert(_scalars.end(), cont_scals.begin(), cont_scals.end());

    /// Получить скаляры углов
    PShiTomasiCornerDetectionTransformation stcorn_trans = std::make_shared<ShiTomasiCornerDetectionTransformation>(in_img);
    auto stcorn_scals = stcorn_trans->getScalars();
    _scalars.insert(_scalars.end(), stcorn_scals.begin(), stcorn_scals.end());

    /// Получить скаляры при Фурье преобразовании
    PFourierTransformation four_trans = std::make_shared<FourierTransformation>(in_img);
    auto four_scals = four_trans->getScalars();
    _scalars.insert(_scalars.end(), four_scals.begin(), four_scals.end());

    if (is_img_res) {
        /// Перевести все скаляры изображения в json
        std::map<std::string, size_t> sm;
        for (const auto s : _scalars) {
            auto smi = sm.find(s);
            if (smi not_eq sm.end()) {
                ++smi->second;
            } else {
                sm.insert(std::make_pair(s, 1));
            }
        }
        std::stringstream res_json;
        res_json << "{\"status\":\"decoded\",\"scalars\":{";
        for (auto sit = sm.begin(); sit not_eq sm.end(); ) {
            res_json << "\"" << sit->first << "\":" << sit->second;
            if (++sit not_eq sm.end()) {
                res_json << ", ";
            }
        }
        res_json << "}";
        _json_result = res_json.str();
        LOG(DEBUG) << "Image is decoded.\n" << _json_result;
        /// Получить результирующую картинку
        cv::Mat img_res = color_trans->imgResult() + cont_trans->imgResult() + stcorn_trans->imgResult() + four_trans->imgResult();
        if (not img_res.empty()) {
            LOG(DEBUG) << "Result Image is concatenated.";
            std::vector<unsigned char> res_img_buf;
            cv::imencode(".png", img_res, res_img_buf);
            _img_buf_result.resize(res_img_buf.size());
            std::copy(res_img_buf.begin(), res_img_buf.end(), _img_buf_result.begin());
        }
    }
}


std::string FoodprodClassifier::imgResult() {
    return _img_buf_result;
}


std::vector<std::string> FoodprodClassifier::getScalars() {
    return _scalars;
}
