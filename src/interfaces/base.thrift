/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Базовый интерфейс для всех Thrift сервисов.
 * \author Величко Ростислав
 * \date   03.12.2015
 */

/// Пример генерации thrift --gen cpp -out ./ service.thrift


namespace cpp arobot

/// Cостояния сервиса.
enum Status {
    DEAD = 0;
    STARTING = 1;
    ALIVE = 2;
    STOPPING = 3;
    STOPPED = 4;
    WARNING = 5;
}


/// Ошибка сетевой операции обращения к сервису.
exception InvalidOperation {
    1:string what;
}


/// Ошибка в работе сервиса.
exception ServiceError {
    1:string what;
}


/// Базовый интерфейс для всех Thrift сервисов.
service BaseService {
    /// Возврат имени сервиса.
    string getName();

    /// Возврат версии сервиса.
    string getVersion();

    /// Возврат состояния сервиса.
    Status getStatus();

    /// Возврат времени начала запуска сервера как UNIX time.
    i64 aliveSince();

    /// Команда серверу на завершение работы.
    oneway void shutdown();
}
