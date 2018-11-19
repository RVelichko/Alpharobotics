/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Клиент для доступа к сервису преобразования TTS.
 * \author Величко Ростислав
 * \date   10.12.2015
 */

#include <iostream>

#include <thrift/transport/TSocket.h>
#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/transport/TTransportUtils.h>

#include "TTSService.h"


namespace tts = arobot::tts ;


int main(int argc, char **argv) {
    using apache::thrift::transport::TSocket;
    using apache::thrift::transport::TTransport;
    using apache::thrift::transport::TFramedTransport;
    using apache::thrift::protocol::TProtocol;
    using apache::thrift::protocol::TBinaryProtocol;

    typedef std::unique_ptr<tts::TTSServiceClient> ClientPtr;

    std::string host = "localhost";
    int port = 10001;

    try {
        boost::shared_ptr<TSocket> socket(new TSocket(host, port));
        boost::shared_ptr<TTransport> transport(new TFramedTransport(socket));
        boost::shared_ptr<TProtocol> protocol(new TBinaryProtocol(transport));
        ClientPtr client = ClientPtr(new tts::TTSServiceClient(protocol));
        transport->open();

        client->textToAudio("Тестовое сообщение.");
    } catch (const arobot::tts::ServiceError& err) {
        std::cerr << "Ошибка клиента: \"" << err.what << "\"\n";
    } catch (...) {
        std::cerr << "Неизвестная ошибка клиента\n";
    }
    return 0;
}

