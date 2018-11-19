/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Базовый обработчик принятых соединений для обработки передаваемых картинок на классификацию.
 * \author Величко Ростислав
 * \date   28.07.2016
 */

#include <json/json.h>

#include "Log.hpp"
#include "BaseClassifierWorker.hpp"

using namespace arobot;
using namespace fpc;


BaseClassifierWorker::BaseClassifierWorker(std::mutex &mutex)
    : webserver::Worker(mutex) {
    _types.insert(".png"); _types.insert(".PNG");
    _types.insert(".jpg"); _types.insert(".JPG");
}


BaseClassifierWorker::~BaseClassifierWorker()
{}
