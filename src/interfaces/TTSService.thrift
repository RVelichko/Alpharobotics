/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Определение Thrift интерфейса для сервиса преобразования TTS.
 * \author Величко Ростислав
 * \date   10.12.2015
 */

namespace cpp arobot.tts


/// Ошибка в работе сервиса.
exception ServiceError {
    1:string what;
}


// Определение поискового сервиса.
service TTSService {
  /**
   * \brief Отправка документа в TTS преобразователь.
   *
   * \param text Текст документа.
   */
  void textToAudio(1:string text) throws (1:ServiceError error);
}
