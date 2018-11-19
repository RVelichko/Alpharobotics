// https://109.120.152.76:38828/KIKI-310002/operator
// https://109.120.152.76/KIKI-310002/alfa_operator

function updateWindowPresetsOperator() {
    var presets = {
        fast_presets: [],
        all_presets: []
    };
    $(".operator .fast-presets .preset-button").each(function(){
        presets.fast_presets.push(JSON.parse($(this).attr("preset")));
    });
    $(".operator .presets-tab-content .tab-pane").each(function(){
        var preset_tab = {
            id: $(this).attr("preset-tab-id"),
            name: $(this).attr("preset-tab-name"),
            presets: []
        };
        $(this).find(".preset-button").each(function(){
            preset_tab.presets.push(JSON.parse($(this).attr("preset")));
        });
        presets.all_presets.push(preset_tab);
    });
    window.operator_presets = presets;

    loadJSON("robot_address.json", function(response) {
        window.config = JSON.parse(response);
        saveJson(window.config.json_save_url, window.config.presets_save_path, JSON.stringify(window.operator_presets));
        window.presets = window.operator_presets;
        drawPresets();
    });
}

function SendMessageByEnter() {
    if (window.current_menu == 'menu_operator' && window.preset_send_line_length) {
        SendMessage();
    }
};

function SendMessage() {
    var msg = $('.operator .preset-edit-form .preset-message').val();
    var cmd = $('.operator .preset-edit-form .preset-cmd').val();
    if (msg.search(/.*\/ */) !== -1) {
        cmd = '/' + msg.replace(new RegExp(".*[\/]"), '');
        msg = msg.replace(new RegExp(cmd), '');
    }
    if (cmd.length) {
        msg += cmd;
    };
    sendMessageToRobot(msg);
    var msg = $('.operator .preset-edit-form .preset-message').val("");
    var cmd = $('.operator .preset-edit-form .preset-cmd').val("");
    var cmd = $('.operator .preset-edit-form .insert_smile').html("");
};

function buttonsActionsOperator() {
    $('.operator .fast-presets .col-xs-6 .delete').unbind("click").click(function(){
        $(this).closest('.col-xs-6').remove();
        updateWindowPresetsOperator();
    });
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });
    $('.draggable').draggable({
        revert: true,
        handle: "div.drag"
    });
    $('.operator .preset-button').click(function(){
        var preset = JSON.parse($(this).attr('preset'));
        console.log(JSON.stringify(preset));
        var text = preset.message;
        if (preset.cmd.length) {
            text += preset.cmd;
        };
        addOperatorLogMessage('right', text);
        sendMessageToRobot(text);
    });
    $('.operator .preset-edit-form .btn-success').click(function(){
        SendMessage();
    });
}

function drawPresetsOperator() {
    $('#fast-presets-operator').html('');
    $('.operator .presets-tab').html('');
    $('.operator .presets-tab-content').html('');

    $.each(window.operator_presets.fast_presets, function(key, preset) {
        addPresetButtonOperator(preset, '#fast-presets-operator');
    });
    var maxID = 0;
    $.each(window.operator_presets.all_presets, function(key, tabPreset) {
        addPresetTabOperator(key, tabPreset);
        $.each(tabPreset.presets, function(key, preset) {
            addPresetButtonOperator(preset, '#preset-tab-operator-' + tabPreset.id);
            if(preset.id > maxID) {
                maxID = preset.id;
            }
        });
        setHeights();
    });
    window.maxID = maxID;

    $('.operator .preset-edit-form .preset-save').click(function(){
        if($('.operator .preset-edit-form .preset').val()) {
            var preset = JSON.parse($('.operator .preset-edit-form .preset').val());
            preset.name = $('.operator .preset-edit-form .preset-name').val();
            preset.message = $('.operator .preset-edit-form .preset-message').val();
            preset.cmd_smile = $('.operator .preset-edit-form .preset-smile').val();
            $('.operator .presets .preset-button').each(function () {
                if ($(this).attr('preset-id') == preset.id) {
                    var template =
                        "   <button class='btn btn-default col-xs-12 preset-button' preset-id='" + preset.id + "' preset='" + JSON.stringify(preset) + "' data-toggle='tooltip' data-placement='top' title='" + preset.message + "'>" +
                        "   <div class='ellipsis'>" +
                        "       <span class='msg_color'>" + preset.name + "</span>" +
                        "       <span class='cmd_color'>" + preset.cmd + "</span>" +
                        "   </div>";
                    if(preset.cmd_smile) {
                        template +=
                            "   <img src='" + preset.cmd_smile + "'>";
                    }
                    template +=
                        "   </button>";
                    $(this).parent().html(template);
                    $('.operator .presets .preset-button').unbind('click').click(function(){
                        var preset = JSON.parse($(this).attr('preset'));
                    });
                }
            });
            addLogMessage('update', preset.name);
        } else {
            var preset = {};
            preset.id = ++window.maxID;
            preset.name = $('.operator .preset-edit-form .preset-name').val();
            preset.message = $('.operator .preset-edit-form .preset-message').val();
            preset.cmd = '';
            preset.cmd_smile = $('.operator .preset-edit-form .preset-smile').val();
            //window.operator_presets.push(preset);
            addPresetButtonOperator(preset);
            addLogMessage('new', preset.name);
        }
        buttonsActionsOperator();
        updateWindowPresetsOperator();
        setHeights();
    });

    $('.operator .preset-edit-form .preset-delete').click(function(){
        if($('.operator .preset-edit-form .preset').val()) {
            var curPreset = JSON.parse($('.operator .preset-edit-form .preset').val());
            $(".modal-delete .modal-message").text('Вы действительно хотите удалить "' + curPreset.name + '"?');
            $(".modal-delete .modal-confirm").click(function(){
                $('.operator .presets .preset-button').each(function () {
                    if ($(this).attr('preset-id') == curPreset.id) {
                        $(this).parent().remove();
                        console.log($(this));
                    }
                });
                addLogMessage('delete', curPreset.name);
                updateWindowPresetsOperator();
                setHeights();
                $(".modal-delete").hide();
            });
            $(".modal-delete").show();
        }
    });

    buttonsActionsOperator();
    $("#fast-presets-operator").droppable({
        drop: function(event, ui) {
            var preset = JSON.parse(ui.draggable.find("button").attr("preset"));
            addPresetButtonOperator(preset, '#fast-presets-operator');
            updateWindowPresetsOperator();
            setHeights();
            buttonsActionsOperator();
        }
    });
    $('.operator .presets-tab-content .tab-pane').droppable({
        drop: function(event, ui) {
            var preset = JSON.parse(ui.draggable.find("button").attr("preset"));
            $('.operator .presets-tab-content .tab-pane .preset-button').each(function(){
                if($(this).attr('preset-id') == preset.id) {
                    $(this).closest('.col-xs-6').remove();
                    addPresetButtonOperator(preset, '#'+event.target.id);
                    updateWindowPresetsOperator();
                    setHeights();
                    buttonsActionsOperator();
                }
            });
        }
    });
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        setHeights();
    });
    setHeights();
}

function drawSmilesOperator(smiles) {
    $.each(smiles, function(key, smile) {
        if(key == 0) {
            $(".operator .smiles-pannel .selected-smile").html('<img src="' + smile.cmd_smile + '">');
        }
        $(".operator .smiles-pannel .smiles").append('<div class="btn-smile" cmd="' + smile.cmd + '"><img src="' + smile.cmd_smile + '"></div>');
    });

    $(".operator .smiles-pannel .smiles .btn-smile").hover(function(){
        $(".operator .smiles-pannel .selected-smile").html('<img src="' + $(this).find('img').attr('src') + '">');
    });

    $(".operator .smiles-pannel .smiles .btn-smile").click(function(){
        var msg = $('.operator .preset-edit-form .preset-message').val();
        if (msg.search(/.*\/ */) !== -1) {
            var rm_cmd = '/' + msg.replace(new RegExp(".*[\/]"), '');
            msg = msg.replace(new RegExp(rm_cmd), '');
        }
        var cmd = $(this).attr('cmd');
        console.log("$ " + msg + "; " + cmd);
        $('.operator .preset-edit-form .preset-message').val(msg + cmd);
        $('.operator .preset-edit-form .preset-cmd').val(cmd);
        $('.operator .preset-edit-form .preset-smile').val($(this).find('img').attr('src'));
        $('.operator .preset-edit-form .insert_smile').html("<img src='" + $(this).find('img').attr('src') + "'>");
    });
    setHeights();
}

function addPresetTabOperator(num, tabPreset) {
    var template = "<li role='presentation'";
    if(num == 0) {
        template += " class='active'";
    }
    template +=
        ">" +
        "   <a href='#preset-tab-operator-" + tabPreset.id + "' aria-controls='preset-tab-operator-" + tabPreset.id + "' role='tab' data-toggle='tab'>" + tabPreset.name + "</a>" +
        "</li>";
    $('.operator .presets-tab').append(template);

    var template = "<div role='tabpanel' class='tab-pane";
    if(num == 0) {
        template += " active ";
    }
    template +=
        "' id='preset-tab-operator-" + tabPreset.id + "' preset-tab-id='" + tabPreset.id + "' preset-tab-name='" + tabPreset.name + "'></div>";
    $('.operator .presets-tab-content').append(template);
}

function addPresetButtonOperator(preset, tabPreset) {
    var template =
        "<div class='col-xs-6 draggable'>" +
        "   <button class='btn btn-default col-xs-12 preset-button' preset-id='" + preset.id + "' preset='" + JSON.stringify(preset) + "' data-toggle='tooltip' data-placement='top' title='" + preset.message + "'>" +
        "   <div class='ellipsis'>" +
        "       <span class='msg_color'>" + preset.name + "</span>" +
        "       <span class='cmd_color'>" + preset.cmd + "</span>" +
        "   </div>";
    if(preset.cmd_smile) {
        template +=
            "   <img src='" + preset.cmd_smile + "'>";
    }
    template +=
        "   </button>" +
        "   <div class='drag'><i class='fa fa-arrows'></i></div>" +
        "   <div class='delete'><i class='fa fa-times'></i></div>" +
        "</div>";

    if(tabPreset) {
        //console.log(template);
        $(tabPreset).append(template);
    } else {
        $('.operator .presets-tab-content .tab-pane.active ').append(template);
    }

    $('.operator .presets .preset-button').unbind('click').click(function(){
        var preset = JSON.parse($(this).attr('preset'));
    });
}


// Вставка принятого из сети сообщения и отправленного оператором
function addOperatorLogMessage(type, msg) {
    var now = new Date();
    var template;
    template =
        '<div class="msg msg-' + type + '">' +
             msg +
        '    <span class="time">' + now.toISOString() + '</span>' +
        '</div>';
    $('#operator_log').append(template);
}


// Отправка сообщение по сокету
function sendMessageToRobot(text) {
    if (text !== '') {
        try {
            var snd_msg = {
                room_id: window.config.room_id,
                operator_id: window.operator_id,
                msg: window.send_lang + '|' + text
            };
            window.websock.send(JSON.stringify(snd_msg));
            console.log("send to robot: " + JSON.stringify(snd_msg));
        } catch(e) {
            console.log('ERR: Ошибка отправки сообщения в канал данных');
        }
    }
};

$(document).ready(function() {
    // Отключить скролинг страници оператора с клавиатуры
    //$('#menu_operator').ready({ keyboard: false });

    // Обработка событий переключения м\у вкладками
    window.current_menu = 'menu_operator';
    $('.header .menu li a').click(function() {
        console.log('goto: ' + $(this).attr('aria-controls'));
        window.current_menu = $(this).attr('aria-controls');
    });

    // Отслеживать заполненность строки отправляемого сообщения
    window.preset_send_line_length = 0;
    $('.operator .etalon-height .preset-message').on('change', function() {
        window.preset_send_line_length = $(this).val().length;
        console.log('Send line: ' + window.preset_send_line_length);
    });

    $.getJSON('robot_address.json')
        .done(function(json) {
            window.config = json;
            console.log(JSON.stringify(window.config));
            window.room_id = window.config.room_id;

            // Настройка языка отправки
            window.send_lang = 'rus';
            $('.operator .etalon-height .dropdown-menu li a').click(function() {
                console.log('Язык отправки: ' + $(this).text() + ' [' + $(this).attr('lang') + ']');
                $('.etalon-height .dropdown-toggle').text($(this).text());
                window.send_lang = $(this).attr('lang');
            });

            // Загрузка пресетов
            $.getJSON(window.config.presets_url)
                .done(function(json) {
                    console.log('presets: "' + JSON.stringify(json) +'"');
                    window.operator_presets = json;
                    drawPresetsOperator();
                })
                .fail(function(jqxhr, textStatus, error) {
                    console.log('Can`t load ' + window.config.presets_url + ': ' + textStatus + ", " + error);
                });

            $.getJSON(window.config.smiles_url)
                .done(function(json) {
                    console.log('smiles: "' + JSON.stringify(json) + '"');
                    drawSmilesOperator(json);
                })
                .fail(function(jqxhr, textStatus, error) {
                    console.log('Can`t load ' + window.config.smiles_url + ': ' + textStatus + ", " + error);
                });

            //// Локальная отладка
            //window.key_pad = new KeyPad(function() {
            //    console.log('ENTER');
            //}, function(cmd) {
            //    console.log('move: ' + cmd);
            //});

            // Подключение к комнате для обмена с роботом
            window.websock = new WebSocket(window.config.robots_server_url);
            window.websock.onopen = function(e) {
                window.key_pad = new KeyPad(function() {
                    SendMessageByEnter()
                }, function(cmd) {
                    var move = {
                        room_id: window.config.room_id,
                        move: cmd
                    };
                    window.websock.send(JSON.stringify(move));
                    //console.log('send move: ' + cmd);
                });
                window.websock.onmessage = function(e) {
                    console.log("recv: " + e.data);
                    var json = JSON.parse(e.data);
                    if ('req' in json) {
                        addOperatorLogMessage('left', json.req);
                        console.log("req: " + json.req);
                    } else if ('resp' in json) {
                        addOperatorLogMessage('right', json.resp);
                        console.log("resp: " + json.resp);
                    } else if ("operator_id" in json) {
                        window.operator_id = json.operator_id;
                        console.log("connected? id is: " + window.operator_id);
                    }
                };
                var now = new Date();
                var connect = {
                    room_id: window.config.room_id,
                    msg: "Подключился оператор " + window.config.name
                };
                window.websock.send(JSON.stringify(connect));
                console.log("send to server: " + JSON.stringify(connect));
            };
        })
        .fail(function(jqxhr, textStatus, error) {
            console.log('Can`t load "robot_address.json": ' + textStatus + ", " + error);
        });
});
