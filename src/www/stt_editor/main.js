/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Редактор голосовых ответов и событий робота.
 * \author Величко Ростислав
 * \date   08.02.2016
 */

// Скрываемые / Отображаемые панели
var _readonly_pannel_disp = new UTILS.Display(document.getElementById("readonly_pannel"));
var _misunderstand_perc_show_pannel_disp = new UTILS.Display(document.getElementById("misunderstand_perc_show_pannel"));
var _misunderstand_show_pannel_disp = new UTILS.Display(document.getElementById("misunderstand_show_pannel"));
var _spell_timeout_show_pannel_disp = new UTILS.Display(document.getElementById("spell_timeout_show_pannel"));
var _timeout_show_pannel_disp = new UTILS.Display(document.getElementById("timeout_show_pannel"));
var _alarm_clock_show_pannel_disp = new UTILS.Display(document.getElementById("alarm_clock_show_pannel"));
var _add_show_pannel_disp = new UTILS.Display(document.getElementById("add_show_pannel"));
var _add_str_show_pannel_disp = new UTILS.Display(document.getElementById("add_str_show_pannel"));
var _add_timeout_show_pannel_disp = new UTILS.Display(document.getElementById("add_timeout_show_pannel"));
var _add_mis_show_pannel_disp = new UTILS.Display(document.getElementById("add_mis_show_pannel"));
var _add_mis_perc_show_pannel_disp = new UTILS.Display(document.getElementById("add_mis_perc_show_pannel"));
var _add_spell_timeout_show_pannel_disp = new UTILS.Display(document.getElementById("add_spell_timeout_show_pannel"));
var _add_alarm_show_pannel_disp = new UTILS.Display(document.getElementById("add_alarm_show_pannel"));
var _delete_confirm_disp = new UTILS.Display(document.getElementById("delete_confirm"));
var _readonly_child_pannel_disp = new UTILS.Display(document.getElementById("readonly_child_pannel"));
var _delete_child_confirm_disp = new UTILS.Display(document.getElementById("delete_child_confirm"));

var _config;
var _mm_urls;
var _robot_config;

var _curr_scroll = 0;
var _pannel_shift = 150;

UTILS.LoadJSON("stt_editor_config.json", function(response) {
    _config = JSON.parse(response);
    document.getElementById("robot_name").value = 'Настройки правил ответов робота: "' + _config.robot_name + '"';

    // Загрузка правил
    UTILS.LoadJSON(_config.robot_config_url, function(response) {
        _robot_config = JSON.parse(response);

        if (_robot_config.responces !== undefined) {
            // Обработка правил при не достаточном распознавании фраз
            if (_robot_config.responces.misunderstand_perc === undefined) {
                _robot_config.responces.misunderstand_perc = {
                    "img_url":"",
                    "perc":70,
                    "resp":[]
                };
            }
            if (_robot_config.responces.misunderstand_perc.perc === undefined) {
                _robot_config.responces.misunderstand_perc.perc = 70;
            }
            if (_robot_config.responces.misunderstand_perc.resp === undefined) {
                _robot_config.responces.misunderstand_perc.resp = [];
            }

            console.log("misunderstand_perc = " + _robot_config.responces.misunderstand_perc.perc);
            document.getElementById("misunderstand_perc_number").value = _robot_config.responces.misunderstand_perc.perc;
            if (_robot_config.responces.misunderstand_perc.resp.length !== 0) {
                var btn_str = _robot_config.responces.misunderstand_perc.resp[0].substring(0, 12);
                if (_robot_config.responces.misunderstand_perc.resp.length > 1) {
                    btn_str += " ... ";
                }
                var btn = document.getElementById("misunderstand_perc_btn");
                btn.innerHTML = btn_str;
            }

            if (_robot_config.responces.misunderstand_perc.img_url.length !== 0) {
                document.getElementById("misunderstand_perc_img_url").value = _robot_config.responces.misunderstand_perc.img_url;
            }

            for (var i in _robot_config.responces.misunderstand_perc.resp) {
                deleteRepeat(_robot_config.responces.misunderstand_perc.resp,
                             _robot_config.responces.misunderstand_perc.resp[i],
                             function(a, b) {
                    return a.localeCompare(b) === 0;
                });
                addMisunderstandPercPannel(i);
            }

            // Обработка правил при не распознавании фраз
            if (_robot_config.responces.misunderstand === undefined) {
                _robot_config.responces.misunderstand = {
                    "img_url":"",
                    "msg": []
                };
            }

            if (_robot_config.responces.misunderstand.msg.length !== 0) {
                var btn_str = _robot_config.responces.misunderstand.msg[0].substring(0, 12);
                if (_robot_config.responces.misunderstand.length > 1) {
                    btn_str += " ... ";
                }
                var btn = document.getElementById("misunderstand_btn");
                btn.innerHTML = btn_str;
            }

            if (_robot_config.responces.misunderstand.img_url.length !== 0) {
                document.getElementById("misunderstand_img_url").value = _robot_config.responces.misunderstand.img_url;
            }

            for (var i in _robot_config.responces.misunderstand.msg) {
                deleteRepeat(_robot_config.responces.misunderstand.msg, _robot_config.responces.misunderstand.msg[i], function(a, b) {
                    return a.localeCompare(b) === 0;
                });
                addMisunderstandPannel(i);
            }

            // Обработка таймера безумолчного разговора
            if (_robot_config.responces.spell_timeout === undefined) {
                _robot_config.responces.spell_timeout = {
                    "img_url":"",
                    "time":30,
                    "msg":[]
                };
            }
            if (_robot_config.responces.spell_timeout.time === undefined) {
                _robot_config.responces.spell_timeout.time = 30;
            }
            if (_robot_config.responces.spell_timeout.msg === undefined) {
                _robot_config.responces.spell_timeout.msg = [];
            }

            console.log("spell_timeout = " + _robot_config.responces.spell_timeout.time);
            document.getElementById("spell_timeout_number").value = _robot_config.responces.spell_timeout.time;
            if (_robot_config.responces.spell_timeout.msg.length !== 0) {
                var btn_str = _robot_config.responces.spell_timeout.msg[0].substring(0, 12);
                if (_robot_config.responces.spell_timeout.msg.length > 1) {
                    btn_str += " ... ";
                }
                var btn = document.getElementById("spell_timeout_btn");
                btn.innerHTML = btn_str;
            }

            if (_robot_config.responces.spell_timeout.img_url.length !== 0) {
                document.getElementById("spell_timeout_img_url").value = _robot_config.responces.spell_timeout.img_url;
            }

            for (var i in _robot_config.responces.spell_timeout.msg) {
                deleteRepeat(_robot_config.responces.spell_timeout.msg, _robot_config.responces.spell_timeout.msg[i], function(a, b) {
                    return a.localeCompare(b) === 0;
                });
                addSpellTimeoutPannel(i);
            }

            // Обработка таймера молчания
            if (_robot_config.responces.timeout === undefined) {
                _robot_config.responces.timeout = {
                    "img_url":"",
                    "sleep":30,
                    "msg":[]
                };
            }
            if (_robot_config.responces.timeout.sleep === undefined) {
                _robot_config.responces.timeout.sleep = 30;
            }
            if (_robot_config.responces.timeout.msg === undefined) {
                _robot_config.responces.timeout.msg = [];
            }

            console.log("timeout = " + _robot_config.responces.timeout.sleep);
            document.getElementById("timeout_number").value = _robot_config.responces.timeout.sleep;
            if (_robot_config.responces.timeout.msg.length !== 0) {
                var btn_str = _robot_config.responces.timeout.msg[0].substring(0, 12);
                if (_robot_config.responces.timeout.msg.length > 1) {
                    btn_str += " ... ";
                }
                var btn = document.getElementById("timeout_btn");
                btn.innerHTML = btn_str;
            }

            if (_robot_config.responces.timeout.img_url.length !== 0) {
                document.getElementById("timeout_img_url").value = _robot_config.responces.timeout.img_url;
            }

            for (var i in _robot_config.responces.timeout.msg) {
                deleteRepeat(_robot_config.responces.timeout.msg, _robot_config.responces.timeout.msg[i], function(a, b) {
                    return a.localeCompare(b) === 0;
                });
                addTimeoutPannel(i);
            }

            // Обработка будильников
            if (_robot_config.responces.alarm_clocks === undefined) {
                _robot_config.responces.alarm_clocks = [];
            }

            if (_robot_config.responces.alarm_clocks.length !== 0) {
                var btn_str =
                    _robot_config.responces.alarm_clocks[0].clock_h + ":" +
                    _robot_config.responces.alarm_clocks[0].clock_m;
                if (_robot_config.responces.alarm_clocks.length > 1) {
                    btn_str += " ... ";
                }
                var btn = document.getElementById("alarm_clock_btn");
                btn.innerHTML = btn_str;
            }

            for (var i in _robot_config.responces.alarm_clocks) {
                deleteRepeat(_robot_config.responces.alarm_clocks, _robot_config.responces.alarm_clocks[i], function(a, b) {
                    var clock = a.clock_h + ":" + a.clock_m;
                    return clock.localeCompare(b.clock_h + ":" + b.clock_m) === 0;
                });
                addAlarmClockPannel(i);
            }

            // Обработка правил ответа на распознанные фразы
            if (_robot_config.responces.regexes === undefined) {
                _robot_config.responces.regexes = [];
            }

            for (var i in _robot_config.responces.regexes) {
                deleteRepeat(_robot_config.responces.regexes, _robot_config.responces.regexes[i], function(a, b) {
                    return a.regex.localeCompare(b.regex) === 0;
                });
                console.log("r: " + _robot_config.responces.regexes[i].regex + " -> " + _robot_config.responces.regexes[i].resp);
                var btm_name = " ... ";
                if (_robot_config.responces.regexes[i].resp.length !== 0) {
                    btm_name = _robot_config.responces.regexes[i].resp[0].substring(0, 12);
                    if (_robot_config.responces.regexes[i].resp.length > 1) {
                        btm_name += " ... ";
                    }
                }
                var pannel = addEditLine(document.getElementById("regexes_lines_pannel"), _robot_config.responces.regexes[i].regex);
                var btn = addListButton('', btm_name);
                pannel.appendChild(btn);
                btn.regex_resp_disp =
                    addRegexPannel(i, btm_name, _robot_config.responces.regexes[i].regex, _robot_config.responces.regexes[i].resp, btn);
                btn.onclick = function () {
                    this.regex_resp_disp.show();
                    this.regex_resp_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
                    _readonly_pannel_disp.show();
                };
                var del_btn = addDeleteButton();
                pannel.appendChild(del_btn);
                del_btn.regex_resp_pannel = pannel;
                del_btn.regex_resp_disp = btn.regex_resp_disp;
                del_btn.regex_json = i;
                del_btn.onclick = function() {
                    deleteRegex(this);
                }
            }
        }
        document.getElementById("log_pannel").style.height = (document.getElementById("settings_pannel").offsetHeight - 13) + "px";
    });
});


// Изминение размера поля логирования
window.onresize = function() {
    document.getElementById("log_pannel").style.height = (document.getElementById("settings_pannel").offsetHeight - 13) + "px";
};
document.getElementById("log_pannel").style.height = (document.getElementById("settings_pannel").offsetHeight - 13) + "px";


// Обработка прокрутки экрана для корректного отображения диалоговых и экранирующих окон
window.onscroll = function() {
    _curr_scroll = window.pageYOffset || document.documentElement.scrollTop;
    console.log('scroll=' + _curr_scroll + 'px');

    _readonly_pannel_disp.getDiv().style.top = _curr_scroll + 5 + 'px';
    _readonly_child_pannel_disp.getDiv().style.top = _curr_scroll + 5 + 'px';

    _misunderstand_perc_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _misunderstand_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _spell_timeout_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _timeout_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _alarm_clock_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _add_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _add_str_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _add_timeout_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _add_mis_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _add_mis_perc_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _add_spell_timeout_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _add_alarm_show_pannel_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _delete_confirm_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    _delete_child_confirm_disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
}


function sendJson() {
    var send_json = JSON.stringify(_robot_config);
    if (send_json.length === 0) {
        addLogMessage("ERROR", "Invalid message or name or cmd string. Remove sequence {\",\"}");
    } else {
        var req = new XMLHttpRequest();
        console.log("send: " + _config.save_url + ": \"" + send_json + "\"");
        req.open("POST", _config.save_url, true);
        req.setRequestHeader('Content-Type', 'application/json');
        req.onreadystatechange = function () {
            console.log(req);
        };
        req.send(send_json);
    }
}


function deleteRepeat(array, value, predicate) {
    var c = 0;
    for (var i in array) {
        if (predicate(array[i], value)) {
            ++c;
        }
        if (c > 1) {
            array.splice(i, 1);
            --c;
        }
    }
}


function isRepeate(array, value, predicate) {
    var c = 0;
    for (var i in array) {
        if (predicate(array[i], value)) {
            return true;
        }
    }
    return false;
}


function correctAlarmButtonNameByAdd(btn_name, btn_h, btn_m, array) {
    if (btn_h < 10) {
        btn_h = '0' + btn_h;
    }
    if (btn_m < 10) {
        btn_m = '0' + btn_m;
    }
    var btn_str = btn_h + ":" + btn_m;
    if (array.length > 1) {
        btn_str += " ... ";
    }
    document.getElementById(btn_name).innerHTML = btn_str;
}


function correctButtonNameByAdd(btn_name, btn_str, array) {
    if (array.length > 1) {
        btn_str += " ... ";
    }
    document.getElementById(btn_name).innerHTML = btn_str;
}


function deleteRegex(obj) {
    _delete_confirm_disp.show();
    _readonly_pannel_disp.show();
    document.getElementById("delete_name").innerHTML = _robot_config.responces.regexes[obj.regex_json].regex;
    document.getElementById("confirm_delete_btn").onclick = function() {
        addLogMessage('INFO', 'delete regex ' + _robot_config.responces.regexes[obj.regex_json].regex);
        document.getElementById("regexes_lines_pannel").removeChild(obj.regex_resp_pannel);
        document.body.removeChild(obj.regex_resp_disp.getDiv());
        _robot_config.responces.regexes.splice(obj.regex_json, 1);
        delete obj.regex_resp_disp;
        _delete_confirm_disp.hide();
        _readonly_pannel_disp.hide();
        sendJson();
    };
}


function deleteResponce(obj) {
    _delete_child_confirm_disp.show();
    _readonly_child_pannel_disp.show();
    document.getElementById("delete_child_name").innerHTML =
        _robot_config.responces.regexes[obj.regex_resp_id].resp[obj.resp_id];
    document.getElementById("confirm_delete_child_btn").onclick = function () {
        console.log("del responce: " + _robot_config.responces.regexes[obj.regex_resp_id].resp[obj.resp_id]);
        addLogMessage('INFO', 'delete regex responce ' + _robot_config.responces.regexes[obj.regex_resp_id].resp[obj.resp_id]);
        obj.resp_lines.removeChild(obj.resp_pannel);
        _robot_config.responces.regexes[obj.regex_resp_id].resp.splice(obj.resp_id, 1);
        delete obj.resp_pannel;
        _delete_child_confirm_disp.hide();
        _readonly_child_pannel_disp.hide();
        if (_robot_config.responces.regexes[obj.regex_resp_id].resp.length > 1) {
            var resp = UTILS.First(_robot_config.responces.regexes[obj.regex_resp_id].resp);
            document.getElementById("alarm_clock_btn").innerHTML = resp +  " ... ";
        } else {
            document.getElementById("alarm_clock_btn").innerHTML = " ... ";
        }
        sendJson();
    }
}


function deleteAlarmClock(obj) {
    var log_str =
        _robot_config.responces.alarm_clocks[obj.alarm_clock_id].clock_h + ":" +
        _robot_config.responces.alarm_clocks[obj.alarm_clock_id].clock_m + " -> " +
        _robot_config.responces.alarm_clocks[obj.alarm_clock_id].msg;
    console.log("delete alarm: " + log_str);
    _delete_child_confirm_disp.show();
    _readonly_child_pannel_disp.show();
    document.getElementById("delete_child_name").innerHTML =
        _robot_config.responces.alarm_clocks[obj.alarm_clock_id].clock_h + " : " +
        _robot_config.responces.alarm_clocks[obj.alarm_clock_id].clock_m;
    document.getElementById("confirm_delete_child_btn").onclick = function () {
        addLogMessage('INFO', 'delete alarm ' + log_str);
        document.getElementById("alarm_clock_lines").removeChild(obj.alarm_clock_pannel);
        _robot_config.responces.alarm_clocks.splice(obj.alarm_clock_id, 1);
        delete obj.alarm_clock_pannel;
        _delete_child_confirm_disp.hide();
        _readonly_child_pannel_disp.hide();
        if (_robot_config.responces.alarm_clocks.length > 1) {
            var alarm = UTILS.First(_robot_config.responces.alarm_clocks);
            document.getElementById("alarm_clock_btn").innerHTML = alarm.clock_h + ":" + alarm.clock_m +  " ... ";
        } else {
            document.getElementById("alarm_clock_btn").innerHTML = " ... ";
        }
        sendJson();
    }
}


function deleteTimeout(obj) {
    console.log("delete timeout: " + _robot_config.responces.timeout.msg[obj.timeout_id]);
    _delete_child_confirm_disp.show();
    _readonly_child_pannel_disp.show();
    document.getElementById("delete_child_name").innerHTML = _robot_config.responces.timeout.msg[obj.timeout_id];
    document.getElementById("confirm_delete_child_btn").onclick = function () {
        addLogMessage('INFO', 'delete timeout ' + _robot_config.responces.timeout.msg[obj.timeout_id]);
        document.getElementById("timeout_lines").removeChild(obj.timeout_pannel);
        _robot_config.responces.timeout.msg.splice(obj.timeout_id, 1);
        delete obj.timeout_pannel;
        _delete_child_confirm_disp.hide();
        _readonly_child_pannel_disp.hide();
        if (_robot_config.responces.timeout.msg.length > 1) {
            document.getElementById("timeout_btn").innerHTML =
                UTILS.First(_robot_config.responces.timeout.msg).substring(0, 12) + " ... ";
        } else {
            document.getElementById("timeout_btn").innerHTML = " ... ";
        }
        sendJson();
    }
}


function deleteSpellTimeout(obj) {
    console.log("delete spell timeout: " + _robot_config.responces.spell_timeout.msg[obj.spell_timeout_id]);
    _delete_child_confirm_disp.show();
    _readonly_child_pannel_disp.show();
    document.getElementById("delete_child_name").innerHTML = _robot_config.responces.spell_timeout.msg[obj.spell_timeout_id];
    document.getElementById("confirm_delete_child_btn").onclick = function () {
        addLogMessage('INFO', 'delete spell timeout ' + _robot_config.responces.spell_timeout.msg[obj.spell_timeout_id]);
        document.getElementById("spell_timeout_lines").removeChild(obj.spell_timeout_pannel);
        _robot_config.responces.spell_timeout.msg.splice(obj.spell_timeout_id, 1);
        delete obj.spell_timeout_pannel;
        _delete_child_confirm_disp.hide();
        _readonly_child_pannel_disp.hide();
        if (_robot_config.responces.spell_timeout.msg.length > 1) {
            document.getElementById("spell_timeout_btn").innerHTML =
                UTILS.First(_robot_config.responces.spell_timeout.msg).substring(0, 12) + " ... ";
        } else {
            document.getElementById("spell_timeout_btn").innerHTML = " ... ";
        }
        sendJson();
    }
}


function deleteMisunderstand(obj) {
    console.log("delete misunderstand: " + _robot_config.responces.misunderstand[obj.misunderstand_id]);
    _delete_child_confirm_disp.show();
    _readonly_child_pannel_disp.show();
    document.getElementById("delete_child_name").innerHTML = _robot_config.responces.misunderstand[obj.misunderstand_id];
    document.getElementById("confirm_delete_child_btn").onclick = function () {
        addLogMessage('INFO', 'delete misunderstand ' + _robot_config.responces.misunderstand[obj.misunderstand_id]);
        document.getElementById("misunderstand_lines").removeChild(obj.misunderstand_pannel);
        _robot_config.responces.misunderstand.splice(obj.misunderstand_id, 1);
        delete obj.misunderstand_pannel;
        _delete_child_confirm_disp.hide();
        _readonly_child_pannel_disp.hide();
        if (_robot_config.responces.misunderstand.length > 1) {
            document.getElementById("misunderstand_btn").innerHTML =
                UTILS.First(_robot_config.responces.misunderstand).substring(0, 12) + " ... ";
        } else {
            document.getElementById("misunderstand_btn").innerHTML = " ... ";
        }
        sendJson();
    }
}


function deleteMisunderstandPerc(obj) {
    console.log("delete misunderstand perc: " + _robot_config.responces.misunderstand_perc.resp[obj.misunderstand_perc_id]);
    _delete_child_confirm_disp.show();
    _readonly_child_pannel_disp.show();
    document.getElementById("delete_child_name").innerHTML = _robot_config.responces.misunderstand_perc.resp[obj.misunderstand_perc_id];
    document.getElementById("confirm_delete_child_btn").onclick = function () {
        addLogMessage('INFO', 'delete misunderstand perc ' + _robot_config.responces.misunderstand_perc.resp[obj.misunderstand_perc_id]);
        document.getElementById("misunderstand_perc_lines").removeChild(obj.misunderstand_perc_pannel);
        _robot_config.responces.misunderstand_perc.resp.splice(obj.misunderstand_perc_id, 1);
        delete obj.misunderstand_perc_pannel;
        _delete_child_confirm_disp.hide();
        _readonly_child_pannel_disp.hide();
        if (_robot_config.responces.misunderstand_perc.resp.length > 1) {
            document.getElementById("misunderstand_perc_btn").innerHTML =
                UTILS.First(_robot_config.responces.misunderstand_perc.resp).substring(0, 12) + " ... ";
        } else {
            document.getElementById("misunderstand_perc_btn").innerHTML = " ... ";
        }
        sendJson();
    }
}


function addEditLine(parent_pannel, input_value) {
    var pannel = document.createElement("DIV");
    parent_pannel.appendChild(pannel);
    pannel.setAttribute("class", "border");

    var input = document.createElement("INPUT");
    pannel.appendChild(input);
    input.setAttribute("type", "text");
    input.setAttribute("class", "input_edit");
    input.value = input_value;

    return pannel;
}


//function addAlarmEditLine(parent_pannel, input_clock_h, input_clock_m, input_value, img_urlimg_url, alarm_clock_id) {
function addAlarmEditLine(parent_pannel, input_clock_h, input_clock_m, input_value, alarm_clock_id) {
    var pannel = document.createElement("DIV");
    parent_pannel.appendChild(pannel);
    pannel.setAttribute("class", "border");

    var clock_h = document.createElement("INPUT");
    pannel.appendChild(clock_h);
    clock_h.setAttribute("type", "number");
    clock_h.setAttribute("class", "alarm_clock_input_edit");
    clock_h.value = input_clock_h;
    clock_h.onchange = function() {
        if (this.value < 0) {
            this.value = 0;
        } else if (23 < this.value) {
            this.value = 23;
        }
        console.log('alarm h=' + this.value);
    };

    var clock_m = document.createElement("INPUT");
    pannel.appendChild(clock_m);
    clock_m.setAttribute("type", "number");
    clock_m.setAttribute("class", "alarm_clock_input_edit");
    clock_m.value = input_clock_m;
    clock_m.onchange = function() {
        if (this.value < 0) {
            this.value = 0;
        } else if (59 < this.value) {
            this.value = 59;
        }
        console.log('alarm m=' + this.value);
    };

    var input = document.createElement("INPUT");
    pannel.appendChild(input);
    input.setAttribute("type", "text");
    input.setAttribute("class", "alarm_str_input_edit");
    input.value = input_value;

    var img_url_input = document.createElement("INPUT");
    pannel.appendChild(img_url_input);
    img_url_input.setAttribute("type", "text");
    img_url_input.setAttribute("class", "alarm_img_url_str_input_edit");
    img_url_input.setAttribute("placeholder", "< URL картинки события >");
    if (_robot_config.responces.alarm_clocks[alarm_clock_id].img_url.length !== 0) {
        img_url_input.setAttribute("value", _robot_config.responces.alarm_clocks[alarm_clock_id].img_url);
    }
    img_url_input.alarm_clock_id = alarm_clock_id;
    img_url_input.onchange = function() {
        _robot_config.responces.alarm_clocks[this.alarm_clock_id].img_url = this.value;
    };

    return pannel;
}


function addListButton(btn_img_class, btn_text) {
    var list_btn = document.createElement("BUTTON");
    list_btn.setAttribute("style", "width: 140px; height: 23px");
    if (btn_img_class.length !== 0) {
        var list_img = document.createElement("DIV");
        list_btn.appendChild(list_img);
        list_img.setAttribute("class", "image " + btn_img_class);
        list_img.setAttribute("style", "margin: auto 5px auto auto");
    }
    list_btn.appendChild(document.createTextNode(btn_text));
    return list_btn;
}


function addDeleteButton() {
    var del_btn = document.createElement("BUTTON");
    del_btn.setAttribute("style", "margin: auto auto auto 5px");
    var del_img = document.createElement("DIV");
    del_btn.appendChild(del_img);
    del_img.setAttribute("class", "image del_img");
    del_btn.appendChild(document.createTextNode(" удалить "));
    return del_btn;
}


function addRegexPannel(regex_id, input_value, regex_str, resps, btn) {
    console.log(input_value + ", " + regex_str + "," + resps);
    var disp = new UTILS.Display(document.createElement("DIV"));
    disp.getDiv().style.top = _curr_scroll + _pannel_shift + 'px';
    document.body.appendChild(disp.getDiv());
    disp.getDiv().setAttribute("class", "show_pannel");
    disp.hide();

    var close_button = document.createElement("BUTTON");
    disp.getDiv().appendChild(close_button);
    var close_img = document.createElement("DIV");
    close_button.appendChild(close_img);
    close_img.setAttribute("class", "image del_img");
    close_button.setAttribute("class", "right");
    close_button.regex_resp_disp = disp;
    close_button.onclick = function() {
        this.regex_resp_disp.hide();
        _readonly_pannel_disp.hide();
    };

    var idiv = document.createElement("DIV");
    disp.getDiv().appendChild(idiv);
    var input = document.createElement("INPUT");
    idiv.appendChild(input);
    input.setAttribute("type", "text");
    input.setAttribute("style", "border: none; width: 80%; text-align: center");
    input.readOnly = true;
    input.value = regex_str;
    idiv.setAttribute("style", "margin: 10px 10px 10px 10px");

    var img_div = document.createElement("DIV");
    img_div.setAttribute("class", "border");
    disp.getDiv().appendChild(img_div);
    var img_url_input = document.createElement("INPUT");
    img_div.appendChild(img_url_input);
    img_url_input.setAttribute("type", "text");
    img_url_input.setAttribute("class", "input_img_url_edit");
    img_url_input.setAttribute("placeholder", "< URL картинки события >");
    img_url_input.regex_id = regex_id;
    img_url_input.onchange = function() {
        _robot_config.responces.regexes[this.regex_id].img_url = this.value;
    };

    var lines = document.createElement("DIV");
    disp.getDiv().appendChild(lines);
    lines.setAttribute("id", regex_str);
    lines.setAttribute("class", "border");
    for (var i in resps) {
        var pannel = addEditLine(lines, resps[i]);
        var del_btn = addDeleteButton();
        pannel.appendChild(del_btn);
        del_btn.resp_lines = lines;
        del_btn.resp_pannel = pannel;
        del_btn.regex_resp_id = regex_id;
        del_btn.resp_id = i;
        del_btn.onclick = function() {
            deleteResponce(this);
        }
    }

    var add_div = document.createElement("DIV");
    disp.getDiv().appendChild(add_div);
    add_div.setAttribute("class","row border");
    var add_button = document.createElement("BUTTON");
    add_div.appendChild(add_button);
    var add_img = document.createElement("DIV");
    add_button.appendChild(add_img);
    add_img.setAttribute("class", "image add_img");
    add_button.setAttribute("class", "right");
    add_button.appendChild(document.createTextNode(" добавить "));
    add_button.regex_resp_disp = disp;
    add_button.regex_resp_id = regex_id;
    add_button.onclick = function() {
        console.log("add_button regex_resp_disp");
        _add_str_show_pannel_disp.show();
        _readonly_child_pannel_disp.show();
        var regex_resp_id = this.regex_resp_id;
        document.getElementById("add_str_save_btn").onclick = function() {
            _add_str_show_pannel_disp.hide();
            _readonly_child_pannel_disp.hide();
            var resp = document.getElementById("new_str").value;
            if (!isRepeate(_robot_config.responces.regexes[regex_resp_id].resp, resp, function(a, b) {
                    return a.localeCompare(b) === 0;
                })) {
                console.log("new responce: " + resp);
                var resp_id = _robot_config.responces.regexes[regex_resp_id].resp.length;
                _robot_config.responces.regexes[regex_resp_id].resp[resp_id] = resp;

                var pannel = addEditLine(lines, resp);
                var del_btn = addDeleteButton();
                pannel.appendChild(del_btn);
                del_btn.resp_lines = lines;
                del_btn.resp_pannel = pannel;
                del_btn.regex_resp_id = regex_resp_id;
                del_btn.resp_id = resp_id;
                del_btn.onclick = function () {
                    deleteResponce(this);
                };
                addLogMessage('INFO', 'add regex responce ' + _robot_config.responces.regexes[regex_resp_id].regex + " -> " + resp);
                sendJson();
            }
        };
        document.getElementById("new_str").value = "";
    };

    var save_button = document.createElement("BUTTON");
    disp.getDiv().appendChild(save_button);
    var save_img = document.createElement("DIV");
    save_button.appendChild(save_img);
    save_img.setAttribute("class", "image save_img");
    save_button.appendChild(document.createTextNode(" сохранить "));
    save_button.regex_resp_disp = disp;
    save_button.onclick = function() {
        this.regex_resp_disp.hide();
        _readonly_pannel_disp.hide();
        addLogMessage('INFO', 'save regexes');
        sendJson();
    };

    var cancel_button = document.createElement("BUTTON");
    disp.getDiv().appendChild(cancel_button);
    var cancel_img = document.createElement("DIV");
    cancel_button.appendChild(cancel_img);
    cancel_img.setAttribute("class", "image del_img");
    cancel_button.appendChild(document.createTextNode(" отменить "));
    cancel_button.regex_resp_disp = disp;
    cancel_button.onclick = function() {
        this.regex_resp_disp.hide();
        _readonly_pannel_disp.hide();
    };
    return disp;
}


function addAlarmClockPannel(id) {
    console.log("alarm_clock: " + JSON.stringify(_robot_config.responces.alarm_clocks[id]));
    var pannel = addAlarmEditLine(
        document.getElementById("alarm_clock_lines"),
        _robot_config.responces.alarm_clocks[id].clock_h,
        _robot_config.responces.alarm_clocks[id].clock_m,
        _robot_config.responces.alarm_clocks[id].msg,
        id);
    var del_btn = addDeleteButton();
    pannel.appendChild(del_btn);
    del_btn.alarm_clock_pannel = pannel;
    del_btn.alarm_clock_id = id;
    del_btn.onclick = function() {
        deleteAlarmClock(this);
    }
}


function addTimeoutPannel(id) {
    console.log("timeout: " + _robot_config.responces.timeout.msg[id]);
    var pannel = addEditLine(document.getElementById("timeout_lines"), _robot_config.responces.timeout.msg[id]);
    var del_btn = addDeleteButton();
    pannel.appendChild(del_btn);
    del_btn.timeout_pannel = pannel;
    del_btn.timeout_id = id;
    del_btn.onclick = function () {
        deleteTimeout(this);
    }
}


function addSpellTimeoutPannel(id) {
    console.log("spell timeout: " + _robot_config.responces.spell_timeout.msg[id]);
    var pannel = addEditLine(document.getElementById("spell_timeout_lines"), _robot_config.responces.spell_timeout.msg[id]);
    var del_btn = addDeleteButton();
    pannel.appendChild(del_btn);
    del_btn.spell_timeout_pannel = pannel;
    del_btn.spell_timeout_id = id;
    del_btn.onclick = function () {
        deleteSpellTimeout(this);
    }
}


function addMisunderstandPannel(id) {
    console.log("misunderstand: " + _robot_config.responces.misunderstand[id]);
    var pannel = addEditLine(document.getElementById("misunderstand_lines"), _robot_config.responces.misunderstand[id]);
    var del_btn = addDeleteButton();
    pannel.appendChild(del_btn);
    del_btn.misunderstand_pannel = pannel;
    del_btn.misunderstand_id = id;
    del_btn.onclick = function () {
        deleteMisunderstand(this);
    }
}


function addMisunderstandPercPannel(id) {
    console.log("misunderstand perc: " + _robot_config.responces.misunderstand_perc.resp[id]);
    var pannel = addEditLine(document.getElementById("misunderstand_perc_lines"), _robot_config.responces.misunderstand_perc.resp[id]);
    var del_btn = addDeleteButton();
    pannel.appendChild(del_btn);
    del_btn.misunderstand_perc_pannel = pannel;
    del_btn.misunderstand_perc_id = id;
    del_btn.onclick = function () {
        deleteMisunderstandPerc(this);
    }
}


function addLogMessage(type, msg) {
    var log_msg = document.createElement("DIV");
    log_msg.setAttribute("style", "margin: 5px 5px 5px 5px;");
    var now = new Date();
    log_msg.innerHTML = now.toISOString() + " - " + type + ": \"" + msg + "\"<br>";
    document.getElementById("log_pannel").appendChild(log_msg);
}


document.getElementById("misunderstand_perc_number").onchange = function() {
    if (10 < this.value && this.value < 100) {
        _robot_config.responces.misunderstand_perc.perc = this.value;
        addLogMessage('INFO', 'misunderstand perc ' + this.value);
        sendJson();
    } else if (10 < this.value) {
        this.value = 10;
    } else if (this.value >= 100) {
        this.value = 100;
    }
    console.log('misunderstand_perc=' + this.value);
};


document.getElementById("spell_timeout_number").onchange = function() {
    if (1 < this.value) {
        _robot_config.responces.spell_timeout.time = this.value;
        addLogMessage('INFO', 'spell timeout ' + this.value);
        sendJson();
    } else {
        this.value = 1;
    }
    console.log('spell_timeout=' + this.value);
};


document.getElementById("timeout_number").onchange = function() {
    if (1 < this.value) {
        _robot_config.responces.timeout.sleep = this.value;
        addLogMessage('INFO', 'timeout ' + this.value);
        sendJson();
    } else {
        this.value = 1;
    }
    console.log('timeout=' + this.value);
};


// Собятия для правил при распознании менее заданного процента
document.getElementById("misunderstand_perc_btn").onclick = function() {
    _misunderstand_perc_show_pannel_disp.show();
    _readonly_pannel_disp.show();
};


document.getElementById("misunderstand_perc_save_btn").onclick = function () {
    _misunderstand_perc_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
    addLogMessage("INFO", "Save misunderstand_perc.");
    sendJson();
};


document.getElementById("misunderstand_perc_add_btn").onclick = function () {
    _add_mis_perc_show_pannel_disp.show();
    _readonly_pannel_disp.show();
};


document.getElementById("misunderstand_perc_cancel_btn").onclick = function () {
    _misunderstand_perc_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
};
document.getElementById("misunderstand_perc_close_btn").onclick = document.getElementById("misunderstand_perc_cancel_btn").onclick;


document.getElementById("add_mis_perc_save_btn").onclick = function() {
    var new_perc_mis = document.getElementById("new_mis_perc").value;
    console.log("mis_perc_add_btn: " + new_perc_mis);
    if (new_perc_mis.length) {
        if (!isRepeate(_robot_config.responces.misunderstand_perc.resp, new_perc_mis, function(a, b) {
                return a.localeCompare(b) === 0;
            })) {
            var id = _robot_config.responces.misunderstand_perc.resp.length;
            _robot_config.responces.misunderstand_perc.resp[id] = new_perc_mis;
            addMisunderstandPercPannel(id);
            correctButtonNameByAdd(
                "misunderstand_perc_btn",
                UTILS.First(_robot_config.responces.misunderstand_perc.resp).substring(0, 12),
                _robot_config.responces.misunderstand_perc.resp);
            addLogMessage('INFO', 'add misunderstand perc ' + new_perc_mis);
            sendJson();
        }
    }
    document.getElementById("new_mis_perc").value = "";
    _add_mis_perc_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};


document.getElementById("add_timeout_show_close_btn").onclick = function() {
    _add_timeout_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};
document.getElementById("add_timeout_cancel_btn").onclick = document.getElementById("add_timeout_show_close_btn").onclick;


// Собятия для правил при не распознании запроса
document.getElementById("misunderstand_btn").onclick = function () {
    _misunderstand_show_pannel_disp.show();
    _readonly_pannel_disp.show();
};


document.getElementById("misunderstand_save_btn").onclick = function () {
    _misunderstand_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
    addLogMessage("INFO", "Save misunderstand.");
    sendJson();
};


document.getElementById("misunderstand_add_btn").onclick = function () {
    _add_mis_show_pannel_disp.show();
    _readonly_child_pannel_disp.show();
};


document.getElementById("misunderstand_cancel_btn").onclick = function () {
    _misunderstand_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
};
document.getElementById("misunderstand_close_btn").onclick = document.getElementById("misunderstand_cancel_btn").onclick;


document.getElementById("add_mis_save_btn").onclick = function() {
    var new_mis = document.getElementById("new_mis").value;
    console.log("mis_add_btn: " + new_mis);
    if (new_mis.length) {
        if (!isRepeate(_robot_config.responces.misunderstand, new_mis, function(a, b) {
                return a.localeCompare(b) === 0;
            })) {
            var id = _robot_config.responces.misunderstand.length;
            _robot_config.responces.misunderstand[id] = new_mis;
            addMisunderstandPannel(id);
            correctButtonNameByAdd(
                "misunderstand_btn",
                UTILS.First(_robot_config.responces.misunderstand).substring(0, 12),
                _robot_config.responces.misunderstand);
            addLogMessage('INFO', 'add misunderstand ' + new_mis);
            sendJson();
        }
    }
    document.getElementById("new_mis").value = "";
    _add_mis_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};


document.getElementById("add_timeout_show_close_btn").onclick = function() {
    _add_timeout_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};
document.getElementById("add_timeout_cancel_btn").onclick = document.getElementById("add_timeout_show_close_btn").onclick;


// Собятия для правил от таймеру при разговоре
document.getElementById("spell_timeout_btn").onclick = function () {
    _spell_timeout_show_pannel_disp.show();
    _readonly_pannel_disp.show();
};


document.getElementById("spell_timeout_save_btn").onclick = function () {
    _spell_timeout_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
    addLogMessage("INFO", "Save spell timeout.");
    sendJson();
};


document.getElementById("spell_timeout_add_btn").onclick = function () {
    console.log("spell_timeout_add_btn");
    _add_spell_timeout_show_pannel_disp.show();
    _readonly_child_pannel_disp.show();
};


document.getElementById("spell_timeout_cancel_btn").onclick = function () {
    _spell_timeout_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
};
document.getElementById("spell_timeout_close_btn").onclick = document.getElementById("spell_timeout_cancel_btn").onclick;


document.getElementById("add_spell_timeout_save_btn").onclick = function() {
    var new_spell_timeout = document.getElementById("new_spell_timeout_str").value;
    console.log("spell_timeout_add_btn: " + new_spell_timeout);
    if (new_spell_timeout.length) {
        if (!isRepeate(_robot_config.responces.spell_timeout.msg, new_spell_timeout, function(a, b) {
                return a.localeCompare(b) === 0;
            })) {
            var id = _robot_config.responces.spell_timeout.msg.length;
            _robot_config.responces.spell_timeout.msg[id] = new_spell_timeout;
            addSpellTimeoutPannel(id);
            correctButtonNameByAdd(
                "spell_timeout_btn",
                UTILS.First(_robot_config.responces.spell_timeout.msg).substring(0, 12),
                _robot_config.responces.spell_timeout.msg);
            addLogMessage('INFO', 'add spell timeout ' + new_spell_timeout);
            sendJson();
        }
    }
    document.getElementById("new_spell_timeout_str").value = "";
    _add_spell_timeout_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};


document.getElementById("add_spell_timeout_show_close_btn").onclick = function() {
    _add_spell_timeout_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};
document.getElementById("add_spell_timeout_cancel_btn").onclick = document.getElementById("add_spell_timeout_show_close_btn").onclick;


// Собятия для правил от таймеру при молчании
document.getElementById("timeout_btn").onclick = function () {
    _timeout_show_pannel_disp.show();
    _readonly_pannel_disp.show();
};


document.getElementById("timeout_save_btn").onclick = function () {
    _timeout_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
    addLogMessage("INFO", "Save timeout.");
    sendJson();
};


document.getElementById("timeout_add_btn").onclick = function () {
    console.log("timeout_add_btn");
    _add_timeout_show_pannel_disp.show();
    _readonly_child_pannel_disp.show();
};


document.getElementById("timeout_cancel_btn").onclick = function () {
    _timeout_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
};
document.getElementById("timeout_close_btn").onclick = document.getElementById("timeout_cancel_btn").onclick;


document.getElementById("add_timeout_save_btn").onclick = function() {
    var new_timeout = document.getElementById("new_timeout_str").value;
    console.log("timeout_add_btn: " + new_timeout);
    if (new_timeout.length) {
        if (!isRepeate(_robot_config.responces.timeout.msg, new_timeout, function(a, b) {
                return a.localeCompare(b) === 0;
            })) {
            var id = _robot_config.responces.timeout.msg.length;
            _robot_config.responces.timeout.msg[id] = new_timeout;
            addTimeoutPannel(id);
            correctButtonNameByAdd(
                "timeout_btn",
                UTILS.First(_robot_config.responces.timeout.msg).substring(0, 12),
                _robot_config.responces.timeout.msg);
            addLogMessage('INFO', 'add timeout ' + new_timeout);
            sendJson();
        }
    }
    document.getElementById("new_timeout_str").value = "";
    _add_timeout_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};


document.getElementById("add_timeout_show_close_btn").onclick = function() {
    _add_timeout_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};
document.getElementById("add_timeout_cancel_btn").onclick = document.getElementById("add_timeout_show_close_btn").onclick;


// События для будильников
document.getElementById("alarm_clock_btn").onclick = function () {
    _alarm_clock_show_pannel_disp.show();
    _readonly_pannel_disp.show();
};


document.getElementById("alarm_clock_close_btn").onclick = function () {
    _alarm_clock_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
};
document.getElementById("alarm_clock_cancel_btn").onclick = document.getElementById("alarm_clock_close_btn").onclick;


document.getElementById("alarm_clock_add_btn").onclick = function () {
    _add_alarm_show_pannel_disp.show();
    _readonly_child_pannel_disp.show();
};


document.getElementById("alarm_clock_save_btn").onclick = function () {
    _alarm_clock_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
    addLogMessage("INFO", "Save alarm_clock.");
    sendJson();
};


// Добавление правил для ответа
document.getElementById("add_regex_btn").onclick = function () {
    _add_show_pannel_disp.show();
    _readonly_pannel_disp.show();
    console.log("add_regex_btn");
};


document.getElementById("add_save_btn").onclick = function () {
    var new_regex = document.getElementById("new_regex").value;
    var new_resp = [];
    new_resp[0] = document.getElementById("new_resp").value;
    if (new_regex.length !== 0 && new_resp[0].length !== 0) {
        console.log(new_regex + ", " + new_resp[0]);
        if (!isRepeate(_robot_config.responces.regexes, new_regex, function(a, b) {
                return a.regex.localeCompare(b) === 0;
            })) {
            var id = _robot_config.responces.regexes.length;
            _robot_config.responces.regexes[id] = {
                "regex":new_regex,
                "resp":new_resp
            };
            console.log("r[" + id + "]: " + new_regex + " -> " + new_resp[0]);
            var btm_name = new_resp[0].substring(0, 14);
            var pannel = addEditLine(document.getElementById("regexes_lines_pannel"), new_regex);
            var btn = addListButton('', btm_name);
            pannel.appendChild(btn);
            btn.regex_resp_disp = addRegexPannel(id, btm_name, new_regex, new_resp, btn);
            btn.onclick = function() {
                this.regex_resp_disp.show();
                _readonly_pannel_disp.show();
            };
            var del_btn = addDeleteButton();
            pannel.appendChild(del_btn);
            del_btn.regex_resp_pannel = pannel;
            del_btn.regex_resp_disp = btn.regex_resp_disp;
            del_btn.regex_json = id;
            del_btn.onclick = function() {
                deleteRegex(this);
            }
            addLogMessage('INFO', 'add regex ' + new_regex + " -> " + new_resp[0]);
            sendJson();
        }
    } else {
        console.log("add_save_btn");
    }
    document.getElementById("new_regex").value = "";
    document.getElementById("new_resp").value = "";
    _add_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
};


// Бработка добавления правил
document.getElementById("add_show_close_btn").onclick =  function () {
    _add_show_pannel_disp.hide();
    _readonly_pannel_disp.hide();
};
document.getElementById("add_cancel_btn").onclick = document.getElementById("add_show_close_btn").onclick;


// Бработка добавления строк
document.getElementById("add_str_show_close_btn").onclick=  function () {
    _add_str_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};
document.getElementById("add_str_cancel_btn").onclick = document.getElementById("add_str_show_close_btn").onclick;


// Бработка добавления будильников
document.getElementById("add_alarm_show_close_btn").onclick = function() {
    _add_alarm_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};
document.getElementById("add_alarm_cancel_btn").onclick = document.getElementById("add_alarm_show_close_btn").onclick;


document.getElementById("new_alarm_clock_h").onchange = function() {
    if (this.value < 0) {
        this.value = 0;
    } else if (23 < this.value) {
        this.value = 23;
    }
    console.log('new alarm h=' + this.value);
};


document.getElementById("new_alarm_clock_m").onchange = function() {
    if (this.value < 0) {
        this.value = 0;
    } else if (59 < this.value) {
        this.value = 59;
    }
    console.log('new alarm h=' + this.value);
};


document.getElementById("add_alarm_save_btn").onclick = function() {
    var new_alarm_clock_h = document.getElementById("new_alarm_clock_h").value;
    var new_alarm_clock_m = document.getElementById("new_alarm_clock_m").value;
    var new_alarm_msg = document.getElementById("new_alarm_msg").value;
    if (new_alarm_clock_h.length && new_alarm_clock_m.length && new_alarm_msg.length) {
        if (new_alarm_clock_h < 0) {
            new_alarm_clock_h = -new_alarm_clock_h;
        }
        if (new_alarm_clock_m < 0) {
            new_alarm_clock_m = -new_alarm_clock_m;
        }
        new_alarm_clock_h %= 24;
        new_alarm_clock_m %= 60;
        if (!isRepeate(_robot_config.responces.alarm_clocks, new_alarm_clock_h + ":" + new_alarm_clock_m, function(a, b) {
                var time = a.clock_h + ":" + a.clock_m;
                return time.localeCompare(b) === 0;
            })) {
            var id = _robot_config.responces.alarm_clocks.length;
            _robot_config.responces.alarm_clocks[id] = {
                "clock_h": new_alarm_clock_h,
                "clock_m": new_alarm_clock_m,
                "msg": new_alarm_msg,
            };
            addAlarmClockPannel(id);
            var alarm = UTILS.First(_robot_config.responces.alarm_clocks);
            correctAlarmButtonNameByAdd("alarm_clock_btn", alarm.clock_h, alarm.clock_m, _robot_config.responces.alarm_clocks);
            addLogMessage('INFO', 'add alarm ' + new_alarm_clock_h + ":" + new_alarm_clock_m + " -> " + new_alarm_msg);
            sendJson();
        }
    }
    document.getElementById("new_alarm_clock_h").value = "";
    document.getElementById("new_alarm_clock_m").value = "";
    document.getElementById("new_alarm_msg").value = "";
    _add_alarm_show_pannel_disp.hide();
    _readonly_child_pannel_disp.hide();
};


// События при изменении урла с картинкой
document.getElementById('misunderstand_perc_img_url').onchange = function() {
    _robot_config.responces.misunderstand_perc.img_url = this.value;
};

document.getElementById('misunderstand_img_url').onchange = function() {
    _robot_config.responces.misunderstand.img_url = this.value;
};

document.getElementById('spell_timeout_img_url').onchange = function() {
    _robot_config.responces.spell_timeout.img_url = this.value;
};

document.getElementById('timeout_img_url').onchange = function() {
    _robot_config.responces.timeout.img_url = this.value;
};


// Удаление правила для ответа
document.getElementById("cancel_delete_btn").onclick = function () {
    _delete_confirm_disp.hide();
    _readonly_pannel_disp.hide();
};


// Удаление одного из ответов в правиле
document.getElementById("cancel_delete_child_btn").onclick = function () {
    _delete_child_confirm_disp.hide();
    _readonly_child_pannel_disp.hide();
};


document.onkeyup = function(e) {
    e = e || window.event;
    if (e.keyCode === 13) {
        sendJson();
    }
    return false;
}
