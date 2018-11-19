/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */

Alarms = function(alarm_clocks, callback) {
    var REPEAT_KF = 60000;
    var _repeats = [];
    var _in_alarms = []; // не сработанные будильники

    for(i in alarm_clocks) {
        _in_alarms[i] = {
            start:false,
            ac:alarm_clocks[i]
        }
    };

    // Старт поминутного обработчика будильников
    function minutesWorker() {
        var now = new Date();
        var i;
        // Пройти по всем будильникам
        for (i in _in_alarms) {
            // Обработанные будильники пропустить
            if (!_in_alarms[i].start) {
                var ac = _in_alarms[i].ac;
                var now_h = now.getHours();
                var now_m = now.getMinutes();
                var now_t = now.getTime();
                // Выполнить текущий будильник с минутным интервалом
                if (ac.hours == now_h && ac.minutes == now_m) {
                    if (callback) {
                        console.log('Call [' + i + '] ' + now_t + ': ' + JSON.stringify(ac));
                        callback(i);
                    }
                }
                // Добавить повторяемые будильники в посекундный обработчик
                var rs = parseInt(ac.repeat, 10) * REPEAT_KF;
                if ((ac.hours < now_h || (ac.hours == now_h && ac.minutes <= now_m)) && rs != 0 && !_repeats[i]) {
                    _repeats[i] = {
                        id: i,
                        repeat: rs,
                        time: now_t + rs
                    };
                    console.log('Init repeat [' + i + '] ' + _repeats[i].time + ': ' + JSON.stringify(ac));
                }
                // Исключить будильник из дальнейшей обработки
                if (ac.hours <= now_h && ac.minutes <= now_m) {
                    _in_alarms[i].start = true;
                }
            }
        }
    };
    var _min_worker = setInterval(minutesWorker, 60000);

    // Запутить посекундный обработчик для повторяемых будильников
    function repeatsWorker() {
        var now = new Date();
        for (i in _repeats) {
            var r = _repeats[i];
            var now_t = now.getTime();
            if (r.time <= now_t) {
                r.time += r.repeat;
                if (callback) {
                    console.log('Repeat [' + i + '] ' + r.time + ': ' + JSON.stringify(r));
                    callback(i);
                }
            }
        }
    };
    var _rep_worker = setInterval(repeatsWorker, REPEAT_KF);

    // Выполнить инициализацию при запуске таймеров
    minutesWorker();

    this.reset = function(new_alarm_clocks) {
        // Остановить таймеры
        clearInterval(_min_worker);
        clearInterval(_rep_worker);
        // Очистить массив повторяемых событий
        _repeats = [];
        _in_alarms = [];
        // Проинициализировать массив новыми значениями
        for(i in new_alarm_clocks) {
            _in_alarms[i] = {
                start:false,
                ac:new_alarm_clocks[i]
            }
        };
        // Выполнить инициализацию при вызове переинициализации
        minutesWorker();
        //repeatsWorker();
        // Запустить таймеры обработчиков
        _min_worker = setInterval(minutesWorker, 60000);
        _rep_worker = setInterval(repeatsWorker, REPEAT_KF);
    };
};