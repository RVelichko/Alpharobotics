/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Базовый обработчик принятых соединений для обработки передаваемых картинок на классификацию.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#pragma once

#include <map>
#include <string>
#include <mutex>
#include <memory>
#include <functional>

#include "WebSocketServer.hpp"
#include "FoodprodClassifier.hpp"

namespace arobot {
namespace fpc {

struct ConnectionPath 
    : public webserver::ConnectionValue {
    size_t _size;
    std::string _file;
    std::string _info;
    std::vector<char> _buf;
};


typedef std::shared_ptr<ConnectionPath> PConnectionPath;


class BaseClassifierWorker
    : public webserver::Worker {
protected:
    std::set<std::string> _types;

public:
    explicit BaseClassifierWorker(std::mutex &mutex);
    virtual ~BaseClassifierWorker();
};
} /// fpc
} /// arobot
