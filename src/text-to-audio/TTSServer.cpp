/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Сервис преобразования TTS.
 * \author Величко Ростислав
 * \date   10.12.2015
 */

#include <iostream>

#include <boost/shared_ptr.hpp>
#include <boost/make_shared.hpp>

#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/server/TSimpleServer.h>
#include <thrift/transport/TServerSocket.h>
#include <thrift/transport/TBufferTransports.h>
#include <thrift/concurrency/ThreadManager.h>
#include <thrift/concurrency/PosixThreadFactory.h>
#include <thrift/server/TNonblockingServer.h>

#include "Log.hpp"
#include "ServiceHandler.hpp"
#include "TTSService.h"


namespace tts = arobot::tts;
namespace utils = arobot::utils;

namespace details {

class TTSService
    : virtual public tts::TTSServiceIf {
public:
    TTSService()
    {}

    /**
    * \brief Отправка документа в TTS преобразователь.
    *
    * \param text  Текст преобразуемого документа.
    */
    void textToAudio(const std::string &text) {
        std::cout << "server recv textToAudio(" << text << ")\n";
    }
};


/**
* \brief Перехват сообщениий из thrift.
*/
void PrintLogMessage(const char *msg) {
    LOG(DEBUG) << msg;
}
} // details


int main(int argc, char **argv) {
    int port = 10001;
    try {
        using apache::thrift::TProcessor;
        using apache::thrift::protocol::TProtocolFactory;
        using apache::thrift::protocol::TBinaryProtocolFactory;
        using apache::thrift::concurrency::ThreadManager;
        using apache::thrift::concurrency::PosixThreadFactory;
        using apache::thrift::server::TNonblockingServer;

        apache::thrift::GlobalOutput.setOutputFunction(details::PrintLogMessage);

        boost::shared_ptr<details::TTSService> service = boost::make_shared<details::TTSService>();
        boost::shared_ptr<TProcessor> processor = boost::make_shared<tts::TTSServiceProcessor>(service);

        processor->setEventHandler(boost::make_shared<utils::ProcessorEventHandler>());
        boost::shared_ptr<TProtocolFactory> protocol_factory = boost::make_shared<TBinaryProtocolFactory>();

        boost::shared_ptr<ThreadManager> thread_manager = ThreadManager::newSimpleThreadManager(9);
        boost::shared_ptr<PosixThreadFactory> thread_factory = boost::make_shared<PosixThreadFactory>();
        thread_manager->threadFactory(thread_factory);
        thread_manager->start();

        TNonblockingServer server(processor, protocol_factory, port, thread_manager);
        server.setServerEventHandler(boost::make_shared<utils::ServerEventHandler>());
        server.serve();
    } catch (const arobot::tts::ServiceError& err) {
        std::cerr << "Ошибка сервиса: \"" << err.what << "\"\n";
    } catch (...) {
        std::cerr << "Неизвестная ошибка сервиса.\n";
    }
    return 0;
}

