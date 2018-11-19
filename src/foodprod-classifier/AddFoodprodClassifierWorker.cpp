/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Обработчик принятых соединений для добавления передаваемых картинок в базу классификатора.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include <fstream>

#include <json/json.h>

#include <boost/filesystem.hpp>

#include "Log.hpp"
#include "AddFoodprodClassifierWorker.hpp"

using namespace arobot;
using namespace fpc;

namespace bfs = boost::filesystem;

typedef std::shared_ptr<FoodprodClassifier> PFoodprodClassifier;
typedef webserver::PConnectionValue PConnectionValue;
typedef webserver::ConnectionValuesIter ConnectionValuesIter;


AddFoodprodClassifierWorker::AddFoodprodClassifierWorker(std::mutex &mutex,
                                                         const std::shared_ptr<NbClassifierModel> &nbc_model,
                                                         const std::string &model_file_name)
    : BaseClassifierWorker(mutex)
    , _nbc_model(nbc_model)
    , _model_file_name(model_file_name) {
    if (bfs::exists(bfs::path(model_file_name))) {
        /// Десериализовать обученную модель из файла
        std::ifstream ifs(_model_file_name.c_str(), std::ios::binary);
        _nbc_model->deserialise(ifs);
    }
}


AddFoodprodClassifierWorker::~AddFoodprodClassifierWorker()
{}


PConnectionValue AddFoodprodClassifierWorker::firstMessage(size_t connection_id, const std::string &msg) {
    PConnectionPath con_path;
    try {
        Json::Value json;
        Json::Reader reader;
        if (reader.parse(msg, json)) {
            if (not json["name"].isNull() and not json["category"].isNull()) {
                std::string cat = json["category"].asString();
                if (cat.compare("PACKED") == 0 or cat.compare("WEIGHT_OUT") == 0) {
                    con_path = std::make_shared<ConnectionPath>();
                    con_path->_size = json["size"].asUInt();
                    con_path->_file = json["name"].asString();
                    con_path->_info = cat;
                    LOG(DEBUG) << connection_id << ": < New image json: \"" << msg << "\"";
                } else {
                    _err_func(connection_id, "Undefined category type `" + cat + "`");
                }
            } else {
                _err_func(connection_id, "Can`t find json parameters name or category.");
            }
        }
    } catch (const std::exception &e) {
        _err_func(connection_id, "Can`t parse input json message '" + msg + "'; " + e.what());
    }
    return con_path;
}


bool AddFoodprodClassifierWorker::lastMessage(const ConnectionValuesIter &iter, const std::string &msg) {
    ConnectionPath *con_path = dynamic_cast<ConnectionPath*>(iter->second.get());
    auto error_func = [=](const std::string &what) {
        std::stringstream resp_ss;
        resp_ss << "file: " << con_path->_file << ", what: " << what;
        _err_func(con_path->_connection_id, resp_ss.str());
        LOG(ERROR) << con_path->_connection_id << ": > \"" << resp_ss.str() << "\"";
    };
    /// Допринять буффер данных
    if (con_path->_buf.size() + msg.size() <= con_path->_size) {
        con_path->_buf.insert(con_path->_buf.end(), msg.begin(), msg.end());
        LOG(DEBUG) << con_path->_connection_id << ": receaved: " << con_path->_buf.size();
    }
    /// Обработать принятый файл
    if (con_path->_buf.size() == con_path->_size) {
        try {
            PFoodprodClassifier fpc = std::make_shared<FoodprodClassifier>(con_path->_buf, false);
            std::vector<std::string> scalars = fpc->getScalars();
            fpc.reset();
            if (not scalars.empty()) {
                NbClassifierModel::CatType cat;
                if (con_path->_info.compare("PACKED") == 0) {
                    cat = NbClassifierModel::CatType::FIRST;
                }
                if (con_path->_info.compare("WEIGHT_OUT") == 0) {
                    cat = NbClassifierModel::CatType::SECOND;
                }
                size_t cat_num = _nbc_model->addObject(cat, scalars);
                std::ofstream ofs(_model_file_name.c_str(), std::ios::binary);
                _nbc_model->serialise(ofs);

                /// Отправить json с флагом успешного сохранения
                std::stringstream resp_ss;
                resp_ss << "{\"file\":\"" << con_path->_file << "\",\"status\":\"added\",\"count\":" << cat_num << "}";
                LOG(DEBUG) << con_path->_connection_id << ": > json: " << resp_ss.str();
                _msg_func(con_path->_connection_id, resp_ss.str(), WS_STRING_MESSAGE);
            } else {
                /// Отправить сообщение о невозможности декодировать файл
                error_func("can`t decode image and add scalars to model");
            }
        } catch (const std::exception& e) {
            /// Отправить json с сообщением об ошибке
            error_func(e.what());
        }
        /// Завершить обработку
        return true;
    }
    return false;
}
