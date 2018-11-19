/*!
 * \brief  Обёртка для работы с таймером.
 * \author R.N.Velichko rostislav.vel@gmail.com
 * \date   02.03.2013
 */

#pragma once

#include <chrono>
#include <thread>
#include <atomic>
#include <algorithm>

namespace utils {

namespace chr = std::chrono;

/// Шаг асинхронного ожидания истечения заданного времени в милисекундах
static const size_t ASYNC_THRED_STEP = 100; // mlsec

/**
 * Посекундный таймер с корректной остановкой потока.
 */
class Timer {
    std::atomic_flag             _is_run; ///< Атомарный флаг
    std::shared_ptr<std::thread> _thread; ///< Поток циклического таймера

public:
    /**
     * Шаблонный конструктор объекта таймера.
     * \param  mlsleep  Интервал задержки до выполненения переданной функции в милисекундах.
     * \param  async    Флаг выполнения ожидания в асинхронном режиме.
     * \param  callback Выполняемая функция.
     * \param  аrgs     Изменяемый набор параметров выполняемой функции.
     */
    template<class Callable, class... Arguments>
    Timer(size_t mlsleep, bool async, Callable &&callback, Arguments&&... args) {
        /// Функтор с переменным числом параметров
        auto task(std::bind(std::forward<Callable>(callback), std::forward<Arguments>(args)...));
        /// Асинхронное ожидание таймера с периодическим освобождением потока
        if (async) {
            /// Инициализация атомарного флага
            _is_run.test_and_set(std::memory_order_acquire);
            /// Запуск асинхронного потока
            _thread = std::make_shared<std::thread>([=] {
                /// Получить время отсчёта таймера
                chr::steady_clock::time_point start = chr::steady_clock::now();
                while (_is_run.test_and_set(std::memory_order_acquire)) {
                    /// Заснуть на время не больше пошагового интервала
                    std::this_thread::sleep_for(chr::milliseconds(std::min(ASYNC_THRED_STEP, mlsleep)));
                    /// Проверить готовность таймера
                    chr::nanoseconds diff = std::chrono::duration_cast<chr::nanoseconds>(chr::steady_clock::now() - start);
                    if (mlsleep <= std::chrono::duration_cast<chr::milliseconds>(diff).count()) {
                        task();
                        start = chr::steady_clock::now();
                    }
                }
            });
        /// Конструктор будет ожидать завершения работы таймера
        } else {
            std::this_thread::sleep_for(chr::milliseconds(mlsleep));
            task();
        }
    }

    ~Timer() {
        /// Корректное уничтожение запущенного потока
        if (_thread) {
            _is_run.clear(std::memory_order_release);
            _thread->join();
        }
    }
};
} /// utils
