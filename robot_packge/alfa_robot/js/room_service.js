/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */

// Функции обработки текстовых сообщений и распознавания
GoogleSpeech = function(lang, send_inter_func, send_res_func) {
    var _scope = this;
    var _current_str;

    var _recognition = new webkitSpeechRecognition();

    var _start_func = function() {
        _recognition.start();
    };
    var _on_end_func = function() {
        _recognition.start();
    };
    var _on_start_func = function() {
        _start_func = function() {};
    };
    var _pause_func = function(symbols_count) {
        _scope.pause(symbols_count);
    };

    _recognition.lang = lang;
    _recognition.continuous = true;
    _recognition.interimResults = true;

    var _start_timestamp;

    _recognition.onstart = function() {
        _start_timestamp = new Date().getTime();
        if (_on_start_func) {
            _on_start_func();
        }
    };

    _recognition.onerror = function(event) {
        if (event.error == 'no-speech') {
        }
        if (event.error == 'audio-capture') {
            console.log('No microphone was found. Ensure that a microphone is installed and that are configured correctly.');
        }
        if (event.error == 'not-allowed') {
            if (event.timeStamp - _start_timestamp < 100) {
                console.log('Permission to use microphone is blocked. To change, go to chrome://settings/contentExceptions#media-stream');
            } else {
                console.log('Permission to use microphone was denied.');
            }
        }
    };

    _recognition.onend = function() {
        if (_on_end_func) {
            _on_end_func();
        }
    };

    _recognition.onresult = function(event) {
        var inter_transcript = '';
        if (typeof(event.results) == 'undefined') {
            _recognition.stop();
        } else {
            for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) { // Обработка итогового результата распознавания
                    send_res_func(event.results[i][0].transcript, event.results[i][0].confidence.toFixed(2));
                    console.log('> ' + event.results[i][0].transcript + ': ' + event.results[i][0].confidence.toFixed(2));
                } else { // Обработка промежуточного результата распознавания
                    inter_transcript += event.results[i][0].transcript;
                    if (_current_str == inter_transcript) {
                        _recognition.stop();
                        console.log('| stop: "' + _current_str + '"');
                    } else {
                        _current_str = inter_transcript;
                        send_inter_func(_current_str);
                        console.log('> ' + _current_str);
                    }
                }
            }
        }
    };

    function initRestart() {
        clearInterval(_restart_timer);
        return setInterval(function() {
            if (_pause_func) {
                _pause_func(1);
            }
        }, 10000);
    }

    // Таймер перезапуска системы распознования каждые 10 сек.
    var _restart_timer = initRestart();

    var _pause_timer;
    this.pause = function(symbols_count) {
        console.log('- Spell pause');
        var _koeff = 150; // примерное колечество милисекунд на озвучивание одного символа
        _pause_func = function() {}; // Выключить автоматический перезапуск каждые 10 секунд на момент паузы

        // Указать действия при подтветждении выключения распознавания
        _on_end_func = function() {
            //console.log('begin PAUSE: ' + symbols_count);
            clearInterval(_restart_timer); // Сбросить таймер перезапуска системы распознования на период паузы
            clearTimeout(_pause_timer); // Перезапустить текущую паузу
            _on_end_func = function() {}; // Выключить автоматический запуск при выключении или ошибке

            // Запустить таймер паузы
            _pause_timer = setTimeout(function() {
                console.log('+ Spell continue');

                // Включить автоматический перезапуск каждые 10 секунд
                _pause_func = function(symbols_count) {
                    _scope.pause(symbols_count);
                };
                _restart_timer = initRestart(); // Восстановить таймер перезапуска системы распознования

                // Восстановить запуск при остановке или ошибке
                _on_end_func = function() {
                    _recognition.start();
                };
                _recognition.start(); // Запустить процесс старта системы распознавания
            }, symbols_count * _koeff);
        };
        _recognition.stop(); // Запустить процесс остановки
        // Включить функцию запуска для внешнего вызова
        _start_func = function() {
            _recognition.start();
        };
    };

    this.stopPause = function() {
        clearTimeout(_pause_timer); // Сбросить текущий таймер паузы

        // Включить автоматический перезапуск каждые 10 секунд
        _pause_func = function(symbols_count) {
            _scope.pause(symbols_count);
        };
        _restart_timer = initRestart(); // Восстановить таймер перезапуска системы распознования

        // Восстановить запуск при остановке или ошибке
        _on_end_func = function() {
            _recognition.start();
        };
        _start_func(); // Запустить процесс старта системы распознавания, избегая повторного вызова
    };

    _recognition.start(); // Запустить процесс старта системы распознавания
};

var _google_speech;

RobotSpell = function(lang) {
    this.send = function(text) {
        if (text !== '') {
            var msg = {
                text: text
            };
            try {
                var send_lang = 'rus';
                var lang_split = text.split('|');
                if (lang_split.length == 2) {
                    send_lang = lang_split[0];
                    text = lang_split[1];
                    console.log('SEND LANG: ' + send_lang);
                };
                var split_text = text.split('/');
                _google_speech.pause(split_text[0].length);
                var req;
                if (lang == 'en-US' || (send_lang == 'eng')) {
                    req = window.config.spell_url + '/speak.php?args=-n ' + window.robot_config.vote_name_0 + ' -s ' + window.robot_config.vote_speed + '&text= ' + split_text[0];
                } else {
                    req = window.config.spell_url + '/speak.php?args=-n ' + window.robot_config.vote_name_1 + ' -s ' + window.robot_config.vote_speed + '&text= ' + split_text[0];
                }
                console.log("spell URL : \"" + req + "\"");
                // Отправить текст на говорилку
                console.log("Try send SPEAK to robot: \"" + req + "\"");
                $.get(req, function(data) {
                    console.log(data);
                }).fail(function(jqxhr, textStatus, error) {
                    console.log('Can`t send GET: ' + req + ':' + textStatus + ", " + error);
                });
                // Отправить команду манипуляций на выполнение
                if (split_text.length == 2) {
                    console.log("Try send ANIM to robot: \"" + split_text[1] + "\"");
                    var gest = window.config.gesticulation_url + '?bvm=' + split_text[1];
                    $.post(gest, function(data) {
                        console.log(data);
                    }).fail(function(jqxhr, textStatus, error) {
                        console.log('Can`t send POST: ' + gest + ':' + textStatus + ", " + error);
                    });
                }

                // Запустить опрос статуса говорилки.
                var pause_interval = setInterval(function() {
                    var status = window.config.spell_url + '/status.php';
                    $.get(status, function(data) {
                        if (data == 'False') {
                            clearInterval(pause_interval);
                            _google_speech.stopPause();
                            console.log('Spell frase is complete.');
                        }
                    });
                }, 100);
                // Выключить запросы в любом случае по истечении 30 секунд.
                setTimeout(function() {
                    clearInterval(pause_interval);
                }, 30000);
            } catch(e) {
                console.log('Ошибка отправки сообщения в канал данных');
            }
        }
    };
};


InitRoomService = function(stt_config) {
    console.log('InitRoomService\n');
    var _scope = this;
    var _server_socket;
    var _robot_id;

    var lang = 'en-US';
    if ('lang' in stt_config) {
        lang = stt_config.lang;
    }

    // Подключение сокета для отправки сообщений и команд
    window.robot_spell = new RobotSpell(lang);

    // Обработка подключения к комнате
    function sockOnMessage(e) {
        console.log("recv " + e.data);
        var json = JSON.parse(e.data);

        if ('room_id' in json) {
            _robot_id = json.robot_id;
        }
        if (json.room_id == window.config.room_id) {
            // Ответ от обработчика робота
            if ('robot_id' in json) {
                if ('resp' in json) {
                    window.robot_spell.send(json.resp);
                    console.log("resp to spell: " + json.resp);
                } else if ('alarm_clock' in json) {
                    window.robot_spell.send(json.alarm_clock);
                    console.log("alarm to spell: " + json.alarm_clock);
                } else if ('timer' in json) {
                    window.robot_spell.send(json.timer);
                    console.log("timer to spell: " + json.timer);
                }
            }
            // Сообщение от оператора
            else if ('operator_id' in json) {
                if ('msg' in json) {
                    window.robot_spell.send(json.msg);
                    console.log("operator to spell: " + json.msg);
                } else if ('move' in json) {
                    console.log(JSON.stringify(json));
                    $.ajax({
                        url : window.config.robot_move_url,
                        type : 'POST',
                        timeout : 7000,
                        cache : false,
                        data : {
                            keypad: json.move,
                            speed: 200
                        },
                        success : function (data) {},
                        error : function (xhr) {
                            $("#out").text("server: " + xhr.statusText);
                        }
                    });
                } else if ('cmd' in json) {
                    if (json.cmd === 'refresh') { // Перезагрузка по требованию оператора
                        location.reload();
                    }
                }
            } else {
                console.log('Undefined json: ' + JSON.stringify(json));
            }
        } else {
            console.log('Undefined room_id: ' + json.room_id);
        }
    }
    function sockOnOpen(e) {
        var now = new Date();
        var json = {
            room_id: window.config.room_id,
            stt_config: JSON.stringify(stt_config)
        };
        _server_socket.send(JSON.stringify(json));
        console.log("> send: " + window.config.robots_server_url + ':\n' + JSON.stringify(json));
    }
    function sockOnError(e) {
        setTimeout(function(){
            console.log('!!! error');
            _server_socket = new WebSocket(window.config.robots_server_url);
            _server_socket.onmessage = function(e){ sockOnMessage(e); };
            _server_socket.onopen = function(e){ sockOnOpen(e); };
            _server_socket.onerror = function(e){ sockOnError(e); };
            _server_socket.onclose = function(e){ sockOnClose(e); };
        }, 100);
    }
    function sockOnClose(e) {
        setTimeout(function(){
            console.log('!!! close');
            _server_socket = new WebSocket(window.config.robots_server_url);
            _server_socket.onmessage = function(e){ sockOnMessage(e); };
            _server_socket.onopen = function(e){ sockOnOpen(e); };
            _server_socket.onerror = function(e){ sockOnError(e); };
            _server_socket.onclose = function(e){ sockOnClose(e); };
        }, 100);
    }
    // Подключиться к серверу комнат
    _server_socket = new WebSocket(window.config.robots_server_url);
    _server_socket.onmessage = function(e){ sockOnMessage(e); };
    _server_socket.onopen = function(e){ sockOnOpen(e); };
    _server_socket.onerror = function(e){ sockOnError(e); };
    _server_socket.onclose = function(e){ sockOnClose(e); };

    _google_speech = new GoogleSpeech(lang, function(str) {
        var json = {
            room_id: window.config.room_id,
            robot_id: _robot_id,
            input_str: str.toLowerCase()
        };
        _server_socket.send(JSON.stringify(json));
    }, function(str, perc) {
        var json = {
            room_id: window.config.room_id,
            robot_id: _robot_id,
            input_str: str.toLowerCase(),
            textequal: Math.floor(perc * 100)
        };
        _server_socket.send(JSON.stringify(json));
    });

    return _server_socket;
};
