/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Обработчик принятых соединений для обработки передаваемых картинок на классификацию.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include <json/json.h>

#include "Log.hpp"
#include "FoodprodClassifierWorker.hpp"

using namespace arobot;
using namespace fpc;

typedef std::shared_ptr<FoodprodClassifier> PFoodprodClassifier;
typedef webserver::ConnectionValuesIter ConnectionValuesIter;


FoodprodClassifierWorker::FoodprodClassifierWorker(std::mutex &mutex, std::shared_ptr<NbClassifier> &nbc)
    : BaseClassifierWorker(mutex)
    , _nbc(nbc)
{}


FoodprodClassifierWorker::~FoodprodClassifierWorker()
{}


webserver::PConnectionValue FoodprodClassifierWorker::firstMessage(size_t connection_id, const std::string &msg) {
    PConnectionPath con_path;
    try {
        Json::Value json;
        Json::Reader reader;
        if (reader.parse(msg, json)) {
            if (not json["size"].isNull() and not json["name"].isNull()) {
                con_path = std::make_shared<ConnectionPath>();
                con_path->_size = json["size"].asUInt();
                con_path->_file = json["name"].asString();
                LOG(DEBUG) << connection_id << ": < New image file: \"" << msg << "\"";
            } else {
                _err_func(connection_id, "Can`t find json parameters name or size.");
            }
        }
    } catch (const std::exception &e) {
        _err_func(connection_id, "Can`t parse input json message '" + msg + "'; " + e.what());
    }
    return con_path;
}


bool FoodprodClassifierWorker::lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
    auto con_path = dynamic_cast<ConnectionPath*>(iter->second.get());
    auto error_func = [=](const std::string &what) {
        std::stringstream resp_ss;
        resp_ss << "file: " << con_path->_file << ", what: " << what;
        _err_func(con_path->_connection_id, resp_ss.str());
        LOG(ERROR) << con_path->_connection_id << ": > \"" << resp_ss.str() << "\"";
    };
    /// Допринять буффер данных
    if (con_path->_buf.size() + msg.size() <= con_path->_size) {
        con_path->_buf.insert(con_path->_buf.end(), msg.begin(), msg.end());
        LOG(DEBUG) << con_path->_connection_id << ": > block: " << msg.size() << " : " << con_path->_buf.size();
    }
    /// Обработать принятый файл
    if (con_path->_buf.size() == con_path->_size) {
        LOG(DEBUG) << con_path->_connection_id << ": > recv: " << con_path->_buf.size();
        try {
            PFoodprodClassifier fpc = std::make_shared<FoodprodClassifier>(con_path->_buf);
            std::string fpc_res_img = fpc->imgResult();
            std::vector<std::string> scalars = fpc->getScalars();
            fpc.reset();
            if (not fpc_res_img.empty() and not scalars.empty()) {
                std::string cat_name = "PACKED";
                switch (_nbc->classify(scalars)) {
                    case NbClassifierModel::CatType::FIRST:  cat_name = "PACKED"; break;
                    case NbClassifierModel::CatType::SECOND: cat_name = "WEIGHT_OUT"; break;
                };
                /// Отправить json с флагом успешного сохранения
                std::stringstream resp_ss;
                resp_ss << "{\"status\":\"ok\",\"file\":\"" << con_path->_file
                        << "\",\"class\":\"" << cat_name << "\"}";
                LOG(DEBUG) << con_path->_connection_id << ": > json: " << resp_ss.str();
                _msg_func(con_path->_connection_id, resp_ss.str(), WS_STRING_MESSAGE);

                /// Отправить результирующую картинку
                LOG(DEBUG) << con_path->_connection_id << ": > img size: " << fpc_res_img.size();
                _msg_func(con_path->_connection_id, fpc_res_img, WS_BINARY_MESSAGE);
            } else {
                /// Отправить сообщение о невозможности декодировать файл
                error_func("can`t decode image");
            }
        } catch (const std::exception& e) {
            /// Отправить json с сообщением об ошибке
            _err_func(con_path->_connection_id, e.what());
        }
        /// Удалить файловый описатель в связи с завершением обработки
        return true;
    }
    return false;
}
