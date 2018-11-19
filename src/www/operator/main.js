/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Страница оператора робота.
 * \author Величко Ростислав
 * \date   24.02.2016
 */

var _config;
var _socket;
var _operator_id;

// Загрузка адреса отправки сообщения
UTILS.LoadJSON("robot_address.json", function(response) {
    _config = JSON.parse(response);

    // Подключение сокета для отправки сообщений и команд
    _socket = io.connect(_config.send_url);

    _socket.on('connect', function () {
        console.log('connected');
        _socket.emit('joinRoom', {
            room: _config.send_room_id,
            role: 'chatwatcher'
        });
    });

    // Загрузка пресетов
    UTILS.LoadJSON(_config.presets_url, function(response) {
        var presets = JSON.parse(response);
        for(var index in presets) {
            var btn = addButton(
                presets[index].name,
                presets[index].message,
                presets[index].cmd,
                presets[index].cmd_smile);

            // Добавление смайлов к кнопкам пресетов
            var smile = presets[index].cmd_smile.toString();
            if (smile.length !== 0) {
                var img = document.createElement("IMG");
                img.src = smile;
                img.style.width = 20 + 'px';
                img.style.height = 20 + 'px';
                btn.appendChild(img);
                addSmileButton(presets[index].cmd, smile);
            }
        }

        // Подключение к комнате для обмена с роботом
        _websock = new WebSocket(_config.rooms_server_url);

        _websock.onopen = function(e) {
            _websock.onmessage = function(e) {
                console.log("recv: " + e.data);
                var json = JSON.parse(e.data);
                if ('req' in json) {
                    var log_msg = document.createElement("DIV");
                    log_msg.setAttribute("class", "robot_text_color");
                    var now = new Date();
                    log_msg.innerHTML = now.toISOString() + " - req: \"" + json.req + "\"";
                    _log_pannel.appendChild(log_msg);
                } else if ('resp' in json) {
                    var log_msg = document.createElement("DIV");
                    log_msg.setAttribute("class", "bot_text_color");
                    var now = new Date();
                    log_msg.innerHTML = now.toISOString() + " - resp: \"" + json.resp + "\"<br>";
                    _log_pannel.appendChild(log_msg);
                } else if ("operator_id" in json) {
                    _operator_id = json.operator_id;
                    console.log("connected? id is: " + _operator_id);
                }
            };
            var now = new Date();
            var connect = {
                room_id: _config.send_room_id,
                msg: "name:" + _config.operator_name + "; date:" + now.toISOString()
            };
            _websock.send(JSON.stringify(connect));
            console.log("send to server: " + JSON.stringify(connect));
        };

        // Изминение размера поля логирования
        _log_pannel.style.height = document.getElementById("buttons_pannel").offsetHeight + "px";
        //var iframe = document.getElementById("ifr_driver");
        //console.log("iframe height= " + iframe.height);
    });
});


// Закрытие сокета
window.onclose = function() {
    _websock.close();
};


// Изминение размера поля логирования
//document.domain = "http://127.0.0.1:63342";
window.onresize = function() {
    _log_pannel.style.height = document.getElementById("buttons_pannel").offsetHeight + "px";
    //console.log("iframe height= " + document.getElementById("ifr_driver").contentDocument.height);
};


// Управление отображением подсказки
var _help = document.getElementById("help");
var _help_disp = new UTILS.Display(_help);

document.onmousemove = function(event) {
    var mouse_x = 0;
    var mouse_y = 0;
    if (document.attachEvent != null) {
        mouse_x = window.event.clientX;
        mouse_y = window.event.clientY;
    } else if (!document.attachEvent && document.addEventListener) {
        mouse_x = event.clientX;
        mouse_y = event.clientY;
    }

    if (mouse_x > window.innerWidth * 0.8) {
        mouse_x = window.innerWidth * 0.8;
    }
    _help.style.left = mouse_x + 15 + "px";
    _help.style.top = mouse_y + 380 + "px";
};


// Добавление кнопок со смайлами
var _selected_smile = document.getElementById("selected_smile");
var _smiles = document.getElementById("smiles");

function addSmileButton(cmd, img) {
    var btn = document.createElement("DIV");
    btn.style.content = "url('"+ img +"')";
    btn.setAttribute("class", "btn-smile");
    _selected_smile.style.content = "url('"+ img +"')";
    btn.setAttribute("onclick", "setSmile(\"" + cmd + "\",\"" + img + "\")");
    btn.setAttribute("onmouseover", "setSmileSelected(\"" + cmd + "\",\"" + img + "\")");
    btn.setAttribute("onmouseout", "hideHelp()");
    _smiles.appendChild(btn);
}


var _presets = document.getElementById("presets");
var _btn_count = 0;

function addButton(name, message, cmd, cmd_smile) {
    var btn = document.createElement("BUTTON");
    _presets.appendChild(btn);
    btn.setAttribute("id", "pres_btn_" + _btn_count);
    btn.setAttribute("ng-disabled", "!inTalk");
    btn.setAttribute("class", "btn btn-success btn-sm");
    btn.style.margin = "3px 3px 3px 3px";

    var dmsg = document.createElement("DIV");
    dmsg.setAttribute("class", "msg_color");
    dmsg.textContent = name;
    btn.appendChild(dmsg);

    var msg = message;
    if (cmd.length !== 0) {
        var cmd_str = " " + cmd;
        msg += cmd_str;
        if (cmd_smile.length === 0) {
            var dcmd = document.createElement("DIV");
            dcmd.setAttribute("class", "cmd_color");
            dcmd.textContent = cmd_str;
            btn.appendChild(dcmd);
        }
    }
    //btn.setAttribute("onclick", 'setChatMsg("'+ _btn_count + '","' + name + '","' +	message + '","' + cmd + '","' + cmd_smile + '")');
    btn.setAttribute("onclick", 'sendChatMsg("'+ message + cmd + '")');
    btn.setAttribute("onmouseover", 'setTextSelected("' + message + '","' + cmd + '")');
    btn.setAttribute("onmouseout", "hideHelp()");
    //console.log("new " + _btn_count);
    ++_btn_count;
    return btn;
}


var _input = document.getElementById("send_text");

document.onkeyup = function(e) {
    e = e || window.event;
    if (e.keyCode === 13) {
        console.log("enter: " + _input.value);
        sendChatMsg(_input.value);
    }
    return false;
};


// Сохранить динамические данные
document.getElementById("save_text_btn").addEventListener("click", function () {
    sendChatMsg(_input.value);
});


var _log_pannel = document.getElementById("log_pannel");

_log_pannel.style.height = document.getElementById("buttons_pannel").offsetHeight + "px";

function addLogMessage(type, msg) {
    var log_msg = document.createElement("DIV");
    log_msg.setAttribute("class", "operator_text_color");
    var now = new Date();
    log_msg.innerHTML = now.toISOString() + " - " + type + ": \"" + msg + "\"<br>";
    _log_pannel.appendChild(log_msg);
}


var _preset_name = document.getElementById("preset_name");
var _curr_id = -1;

function setChatMsg(id, name, msg, cmd, cmds) {
    _curr_id = id;
    console.log("# " + _curr_id);
    if (name.length !== 0) {
        _preset_name.value = name;
    }

    if (cmd.length !== 0) {
        _insert_smile.style.content = "";
        _input.value = msg + " " + cmd;
    } else {
        _input.value = msg;
    }

    if (cmds.length !== 0) {
        _insert_smile.style.content = "url(" + cmds + ")";
    }
}


var _insert_smile = document.getElementById("insert_smile");

function createMessageHtml(text, cmd) {
    return	"<div class=\"msg_color_d\">" + text + "</div>" +
        "<div class=\"cmd_color_d\">" + cmd + "</div>";
}


// Отправка сообщение по сокету
function sendMessageToRobot(text) {
    if (text !== '') {
        try {
            var snd_msg = {
                room_id: _config.send_room_id,
                operator_id: _operator_id,
                msg: text
            };
            _websock.send(JSON.stringify(snd_msg));
            console.log("send to robot: " + JSON.stringify(snd_msg));
        } catch(e) {
            console.log('ERR: Ошибка отправки сообщения в канал данных');
        }
    }
};


function sendChatMsg(msg) {
    if (msg.length !== 0) {
        msg = msg.replace(/[\\\[\]\|\^]/, '');

        var name;
        if (_preset_name.value.length !== 0) {
            name = _preset_name.value;
        } else {
            name = "пресет " + _btn_count;
            console.log("preset: " + msg);
        }
        var message = msg.replace(/\/.*/, '');
        var cmd = '';
        if (msg.search(/.*\/ */) !== -1) {
            cmd = msg.replace(new RegExp(message + " *"), '');

            // Найти смайл
            var cmd_smile = '';
            for (var i = 0; i < _smiles.childNodes.length; i++) {
                var onclick_str = _smiles.childNodes[i].getAttribute("onclick");
                if (onclick_str.indexOf(cmd) > -1) {
                    cmd_smile = onclick_str.match(/\,\".*\"\)/)[0].replace(/[\,\"\)]+/g, '');
                    break;
                }
            }
        }
        _curr_id = -1;

        // Очистить поля
        _preset_name.value = "";
        _input.value = "";
        _insert_smile.style.content = "";

        addLogMessage("send", msg);
        sendMessageToRobot(msg);
    }
}


function setTextSelected(text, cmd) {
    _help_disp.show();
    _help.innerHTML = createMessageHtml(text, cmd);
}


function setSmile(cmd, image_url) {
    var msg = _input.value;
    if (msg.length !== 0) {
        _input.value = msg.replace(/ \/[\w\d ]+/, "") + " " + cmd;
    } else {
        _input.value = " /" + cmd;
    }
    _insert_smile.style.content = "url('"+ image_url +"')";
}


function setSmileSelected(cmd, image_url) {
    _help_disp.show();
    _help.innerHTML = "<div class=\"cmd_color_d\">" + cmd + "</div>";
    _selected_smile.style.content = "url('"+ image_url +"')";
}


function hideHelp() {
    _help_disp.hide();
}
