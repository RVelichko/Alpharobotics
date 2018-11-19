// Функции отображения картинок
var _show_image_disp = new UTILS.Display(document.getElementById("show_image_pannel"));
function showImage(img_url) {
    console.log('showImage(' + img_url + ')');
    _show_image_disp.show();
    var image_pannel = document.getElementById('image_pannel');
    image_pannel.style.content = 'url("' + img_url + '")';
    document.getElementById('image_close_btn').onclick = function() {
        _show_image_disp.hide();
    }
}


ImagesButtons = function(stt_config) {
    function addImage(img_url) {
        if (img_url.length) {
            var btn = document.createElement("BUTTON");
            document.getElementById('images_buttons').appendChild(btn);
            btn.setAttribute('class', 'image_event');
            btn.style.margin = '5px 5px 5px 5px';
            btn.style.padding = '5px 5px 5px 5px';
            btn.style.width  = '100px';
            btn.style.height = '100px';

            var img = document.createElement("DIV");
            img.style.content = 'url("' + img_url + '")';
            img.style.display = 'inline-block';
            img.style.width = '100%';
            img.style.height = '100%';

            btn.appendChild(img);
            btn.setAttribute('onclick', 'showImage("' + img_url + '")');
        }
    }

    if (stt_config.responces.misunderstand_perc !== undefined) {
        if (stt_config.responces.misunderstand_perc.img_url !== undefined) {
            addImage(stt_config.responces.misunderstand_perc.img_url);
            //addImage('kiki/stt_edit_8.png');
        }
    }
    if (stt_config.responces.misunderstand !== undefined) {
        if (stt_config.responces.misunderstand.img_url !== undefined) {
            addImage(stt_config.responces.misunderstand.img_url);
            //addImage('kiki/stt_edit_1.png');
        }
    }
    if (stt_config.responces.spell_timeout !== undefined) {
        if (stt_config.responces.spell_timeout.img_url !== undefined) {
            addImage(stt_config.responces.spell_timeout.img_url);
            //addImage('kiki/stt_edit_2.png');
        }
    }
    if (stt_config.responces.timeout !== undefined) {
        if (stt_config.responces.timeout.img_url !== undefined) {
            addImage(stt_config.responces.timeout.img_url);
            //addImage('kiki/stt_edit_3.png');
        }
    }
    if (stt_config.responces.alarm_clocks !== undefined) {
        for (var i in stt_config.responces.alarm_clocks) {
            if (stt_config.responces.alarm_clocks[i].img_url !== undefined) {
                addImage(stt_config.responces.alarm_clocks[i].img_url);
                //addImage('kiki/stt_edit_4.png');
            }
        }
    }
    if (stt_config.responces.regexes !== undefined) {
        for (var i in stt_config.responces.regexes) {
            if (stt_config.responces.regexes[i].img_url !== undefined) {
                addImage(stt_config.responces.regexes[i].img_url);
                //addImage('kiki/stt_edit_5.png');
            }
        }
    };
};


// Функции обработки текстовый сообщений и распознавания
GoogleSpeech = function(send_inter_func, send_res_func) {
    var _scope = this;
    var recognizing = false;
    var on_error = false;
    var is_pause = false;
    var recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = function() {
        console.log('ONSTART');
        recognizing = true;
        document.getElementById('mic_pannel').src = 'mic-animate.gif';
    };

    recognition.onerror = function(event) {
        if (event.error == 'no-speech') {
            document.getElementById('mic_pannel').src = 'mic.gif';
            console.log('No speech was detected. You may need to adjust your settings');
        }
        if (event.error == 'audio-capture') {
            document.getElementById('mic_pannel').src = 'mic.gif';
            console.log('No microphone was found. Ensure that a microphone is installed and that are configured correctly.');
        }
        if (event.error == 'not-allowed') {
            if (event.timeStamp - start_timestamp < 100) {
                console.log('Permission to use microphone is blocked. To change, go to chrome://settings/contentExceptions#media-stream');
            } else {
                console.log('Permission to use microphone was denied.');
            }
        }
        _scope.start();
    };

    recognition.onend = function() {
        if (!on_error) {
            console.log('ONEND');
            recognizing = false;
            document.getElementById('mic_pannel').src = 'mic.gif';
            if (!is_pause) {
                this.start();
            }
        }
    };

    recognition.onresult = function(event) {
        var inter_transcript = '';
        if (typeof(event.results) == 'undefined') {
            recognition.onend = null;
            recognition.stop();
        } else {
            for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    send_res_func(event.results[i][0].transcript, event.results[i][0].confidence.toFixed(2));
                    console.log('> ' + event.results[i][0].transcript + ': ' + event.results[i][0].confidence.toFixed(2));
                } else {
                    inter_transcript += event.results[i][0].transcript;
                    send_inter_func(inter_transcript);
                    console.log('> ' + inter_transcript);
                }
            }
        }
    };

    this.stop = function(ispause) {
        is_pause = ispause;
        if (recognizing) {
            recognition.stop();
        }
    };

    this.start = function() {
        if (recognizing) {
            recognition.stop();
        } else {
            final_transcript = '';
            recognition.lang = 'ru_RU';
            recognition.start();
            is_pause = false;
            on_error = false;
            document.getElementById('mic_pannel').src = 'mic-slash.gif';
        }
    };
};


SpellPause = function() {
    var koeff = 120; // примерное колечество милисекунд на озвучивание одного символа
    var timer;

    this.pause = function(symbols_count) {
        console.log('begin PAUSE');
        var is_pause = true;
        _google_speech.stop(is_pause);
        timer = setTimeout(function() {
            console.log('end PAUSE');
            _google_speech.start();
        }, symbols_count * koeff * 1000);
    };
};


RobotSpell = function(url, room_id) {
    var robot_socket = io.connect(url);
    robot_socket.on('connect', function () {
        console.log('connected');
        robot_socket.emit('joinRoom', {
            room: room_id,
            role: 'chatwatcher'
        });
    });

    this.send = function(text) {
        if (text !== '') {
            var msg = {
                text: text
            };
            try{
                robot_socket.emit('chat_msg', msg);
                console.log("msg to robot: " + JSON.stringify(msg));
            } catch (e){
                console.log('Ошибка отправки сообщения в канал данных');
            }
        }
    };
};


// Основная часть запуска всех функций
var _config;
var _robot_spell;
var _server_socket;
var _google_speech;
var _spell_pause;
var _robot_id;

function initSpell(response) {
    stt_config = JSON.parse(response);

    // Подключение сокета для отправки сообщений и команд
    _robot_spell = new RobotSpell(_config.spell_url, _config.room_id);

    // Подключиться к серверу комнат
    _server_socket = new WebSocket(_config.rooms_server_url);
    _server_socket.onmessage = function (e) {
        console.log("recv " + e.data);
        var json = JSON.parse(e.data);

        if ('room_id' in json) {
            _robot_id = json.robot_id;
        }
        if (json.room_id == _config.room_id) {
            // Ответ от обработчика робота
            if ('robot_id' in json) {
                if ('resp' in json) {
                    _robot_spell.send(json.resp);
                    console.log("resp to spell: " + json.resp);
                } else if ('alarm_clock' in json) {
                    _robot_spell.send(json.alarm_clock);
                    console.log("alarm to spell: " + json.alarm_clock);
                } else if ('timer' in json) {
                    _robot_spell.send(json.timer);
                    console.log("timer to spell: " + json.timer);
                }
            }
            // Быстрый ответ от оператора
            else if ('operator_id' in json) {
                if ('msg' in json) {
                    _robot_spell.send(json.msg);
                    console.log("operator to spell: " + json.msg);
                }
            } else {
                console.log('Undefined json: ' + JSON.stringify(json));
            }
        } else {
            console.log('Undefined room_id: ' + json.room_id);
        }
    };

    _server_socket.onopen = function (evt) {
        var now = new Date();
        var json = {
            room_id: _config.room_id,
            stt_config: JSON.stringify(stt_config)
        };
        _server_socket.send(JSON.stringify(json));
        console.log("send " + JSON.stringify(json));
    };

    _google_speech = new GoogleSpeech(function(str) {
        var json = {
            room_id: _config.room_id,
            robot_id: _robot_id,
            input_str: str.toLowerCase()
        };
        _server_socket.send(JSON.stringify(json));
    }, function(str, perc) {
        var json = {
            room_id: _config.room_id,
            robot_id: _robot_id,
            input_str: str.toLowerCase(),
            textequal: Math.floor(perc * 100)
        };
        _server_socket.send(JSON.stringify(json));
    });
    _spell_pause = new SpellPause();

    ImagesButtons(stt_config);

    // Запуск преобразователя
    _google_speech.start();
}

window.onload = function () {
    UTILS.LoadJSON("robot_config.json", function(response) {
        _config = JSON.parse(response);
        UTILS.LoadJSON(_config.robot_config_url, function(response) {
            initSpell(response)
        });
    });
};


window.onclose = function() {
    _server_socket.close();
};
