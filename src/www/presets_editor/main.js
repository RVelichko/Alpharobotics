/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Страница оператора робота.
 * \author Величко Ростислав
 * \date   24.02.2016
 */

// Хранилище конфигурации
var _config;
var _log_pannel = document.getElementById("log_pannel");

// Загрузка адреса отправки сообщения
UTILS.LoadJSON("robot_address.json", function(response) {
    _config = JSON.parse(response);

    // Загрузка пресетов
    UTILS.LoadJSON(_config.presets_url, function(response) {
        console.log("presets: " + _config.presets_url);
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
        // Изминение размера поля логирования
        _log_pannel.style.height = document.getElementById("buttons_pannel").offsetHeight + "px";
    });
});


// Изминение размера поля логирования
window.onresize = function() {
    _log_pannel.style.height = document.getElementById("buttons_pannel").offsetHeight + "px";
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
    _help.style.top = mouse_y + 10 + "px";
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
    btn.setAttribute("onclick", 'setChatMsg("'+ _btn_count + '","' + name + '","' +	message + '","' + cmd + '","' + cmd_smile + '")');
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
    console.log("save: " + _input.value);
    sendChatMsg(_input.value);
});


// Удаление пресета статичными функциями
document.getElementById("delete_text_btn").setAttribute("onclick", 'deletePreset()');
document.getElementById("cancel_delete_btn").setAttribute("onclick", 'cancelDelete()');
document.getElementById("confirm_delete_btn").setAttribute("onclick", 'confirmDelete()');


function sendNewPresetsJson() {
    var send_json = JSON.stringify(getPresetsJson());
    if (send_json.length === 0) {
        addLogMessage("ERROR", "Invalid message or name or cmd string. Remove sequence {\",\"}");
    } else {
        var req = new XMLHttpRequest();
        console.log("send: " + _config.save_url + ": \"" + JSON.stringify(send_json) + "\"");
        req.open("POST", _config.save_url, true);
        req.setRequestHeader('Content-Type', 'application/json');
        req.onreadystatechange = function () {
            console.log(req);
        };
        req.send(send_json);
    }
};


var _delete_confirm_disp = new UTILS.Display(document.getElementById("delete_confirm"));
var _readonly_pannel_disp = new UTILS.Display(document.getElementById("readonly_pannel"));

function deletePreset() {
    if (_input.value.length !== 0) {
        document.getElementById("delete_name").innerHTML = "Удалить \"" + _preset_name.value + "\" ?";
        _delete_confirm_disp.show();
        _readonly_pannel_disp.show();
    }
}


function cancelDelete() {
    _delete_confirm_disp.hide();
    _readonly_pannel_disp.hide();
}


function addLogMessage(type, msg) {
    var log_msg = document.createElement("DIV");
    log_msg.setAttribute("style", "margin: 5px 5px 5px 5px;");
    var now = new Date();
    log_msg.innerHTML = now.toISOString() + " - " + type + ": \"" + msg + "\"<br>";
    _log_pannel.appendChild(log_msg);
}


function confirmDelete() {
    _delete_confirm_disp.hide();
    _readonly_pannel_disp.hide();
    for (var i = 0; i < _presets.childNodes.length; i++) {
        if (_presets.childNodes[i].getAttribute("id").localeCompare("pres_btn_" + _curr_id) === 0) {
            _presets.removeChild(_presets.childNodes[i]);
            addLogMessage("delete", _preset_name.value);
            _curr_id = -1;
        }
    }
    // Очистить поля
    _preset_name.value = "";
    _input.value = "";
    _insert_smile.style.content = "";

    sendNewPresetsJson();
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
    return "<div class=\"msg_color_d\">" + text + "</div>" +
        "<div class=\"cmd_color_d\">" + cmd + "</div>";
}


function findSmile(cmd) {
    for (var i = 0; i < _smiles.childNodes.length; i++) {
        var onclick_str = _smiles.childNodes[i].getAttribute("onclick");
        if (onclick_str.indexOf(cmd) > -1) {
            var cmd_smile = onclick_str.match(/\,\".*\"\)/)[0].replace(/[\,\"\)]+/g, '');
            console.log("find smile: " + cmd_smile);
            return cmd_smile;
        }
    }
    return "";
}


function getPresetsJson() {
    var json = [];
    for (var i = 0; i < _presets.childNodes.length; i++) {
        var onclick_str = _presets.childNodes[i].getAttribute("onclick");
        var strs = onclick_str.split("\",\"");
        if (strs.length ===5) {
            var preset = {
                id: strs[0].replace(/\"/g, "").replace(/setChatMsg\(/, ""),
                name: strs[1].replace(/\"/g, ""),
                message: strs[2].replace(/\"/g, ""),
                cmd: strs[3].replace(/\"/g, ""),
                cmd_smile: strs[4].replace(/\"/g, "").replace(/\)/, "")
            };
        } else {
            console.log(strs.length + ": " + onclick_str);
            return "";
        }
        console.log(JSON.stringify(preset));
        json.push(preset);
    }
    return json;
}


function sendChatMsg(msg) {
    if (msg.length !== 0) {
        msg = msg.replace(/[\\\[\]\|\^]/, '');

        var name;
        if (_preset_name.value.length !== 0) {
            name = _preset_name.value;
        } else {
            name = "пресет " + _btn_count;
            console.log(msg);
        }
        var message = msg.replace(/\/.*/, '');
        var cmd = '';
        var cmd_smile = '';

        if (msg.search(/.*\/ */) !== -1) {
            cmd = '/' + msg.replace(new RegExp(".*[\/]"), '');
            console.log("$ " + message + "; " + cmd);
            cmd_smile = findSmile(cmd);
        }

        if (_curr_id !== -1) {
            for (var i = 0; i < _presets.childNodes.length; i++) {
                var btn = _presets.childNodes[i];
                if (btn.getAttribute("id").localeCompare("pres_btn_" + _curr_id) === 0) {
                    // Удалить текущие записи
                    while (btn.firstChild) {
                        btn.removeChild(btn.firstChild);
                    }

                    // Добавить новые записи в кнопку
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
                        } else {
                            var img = document.createElement("IMG");
                            img.src = cmd_smile;
                            img.style.width = 20 + 'px';
                            img.style.height = 20 + 'px';
                            btn.appendChild(img);
                        }
                    }
                    btn.setAttribute("onclick", 'setChatMsg("'+ _curr_id + '","' + name + '","' +	message + '","' + cmd + '","' + cmd_smile + '")');
                    btn.setAttribute("onmouseover", 'setTextSelected("' + message + '","' + cmd + '")');
                    btn.setAttribute("onmouseout", "hideHelp()");

                    addLogMessage("edit", name);
                    _curr_id = -1;
                }
            }
        } else {
            // Добавить кнопку
            console.log("add button: " + name + "," + message + "," + cmd);
            addButton(name,	message, cmd, "");

            // Добавить текстовое сообщение в лог
            addLogMessage("new", msg);
        }

        _curr_id = -1;

        // Очистить поля
        _preset_name.value = "";
        _input.value = "";
        _insert_smile.style.content = "";

        // отправить новую строку на сервер для сохранения
        sendNewPresetsJson();
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
