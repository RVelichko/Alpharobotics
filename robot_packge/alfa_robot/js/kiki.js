/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */

// Запуск Хрома с параметром: --allow-running-insecure-content
function showPresentation() {
    console.log('Show Presentation. ' + window.robot_config.presentation.media);
    $('.page-admin .presentation video source').attr('src', window.robot_config.presentation.media);
    $('.page-admin .presentation video source').attr('onload', function() {
        $('.presentation').show();
    });
    $('.page-admin .presentation video').bind('ended', function() {
        $('.presentation').hide();
        window.robot_spell.send('`/z');
    });
}


function showLogin() {
    if($('.page-media').css('display') == 'block') {
        $('.modal-login').show();
        $('.modal-login .modal-window').css('margin-top', -1 * $('.modal-login .modal-window').height() / 2);
    } else {
        $('.kiki-admin-panel').hide();
        $('.page-admin').show();
        window.is_page_media = true;
    }
}


function loadConfig() {
    $.getJSON('robot_config.json?_=' + new Date().getTime())
        .done(function(json) {
            window.robot_config = json;
            drawAlarms();

            $.each(window.robot_config.help_texts, function(key, text) {
                $('body').append(
                    '<div class="modal-shadow modal-help modal-help-text-' + key + '">' +
                    '   <div class="modal-window">' +
                    '       <div class="modal-title">' +
                    '           <span>Help + Instuctions</span>' +
                    '           <div class="modal-close pull-right"><i class="fa fa-times" aria-hidden="true"></i></div>' +
                    '       </div>' +
                    '       <div class="modal-body">' + text + '</div>' +
                    '       <div class="modal-footer">' +
                    '           <button class="btn btn-danger modal-cancel">Close</button>' +
                    '       </div>' +
                    '   </div>' +
                    '</div>'
                );
            });
            $('.help-text').unbind('click').click(function(){
                $($(this).attr('href')).show();
                return false;
            });
            $('.modal-cancel').unbind('click').click(function(){
                $(this).closest('.modal-shadow').hide();
            });
            $('.modal-close').unbind('click').click(function(){
                $(this).closest('.modal-shadow').hide();
            });
        })
        .fail(function(jqxhr, textStatus, error) {
            console.log('!!!\nFATAL: Can`t load "robot_config.json"\n!!!');
        });
}

// Обработка длинного нажатия.
function initTouch() {
    window.is_show_video = false;
    document.removeEventListener('touchstart');
    document.removeEventListener('touchend');
    document.addEventListener('touchstart', function(e) {
        window.long_tap_timer = setTimeout(function() {
            if (e.touches[0].pageX <= 80 && e.touches[0].pageY <= 80) {
                if (window.is_show_video) {
                    $('#' + window.show_video_id).hide();
                    document.getElementById(window.show_video_source_id).pause();
                    window.is_show_video = false;
                } else {
                    showLogin();
                }
            }
        }, 800);
    }, false);
    document.addEventListener('touchend', function(e) {
        clearTimeout(window.long_tap_timer);
    }, false);
}

$('document').ready(function() {
    window.is_page_media = false;
    initTouch();

    // Запретить контекстное меню
    $('body').on('contextmenu', false);

    $('.presentation').hide();

    var isShift = false;
    document.onkeyup=function(e){
        if(e.which == 16) isShift=false;
    };
    document.onkeydown=function(e) {
        if(e.which == 16) isShift=true;
        if(e.which == 65 && isShift === true) {
            if (window.is_show_video) {
                $('#' + window.show_video_id).hide();
                document.getElementById(window.show_video_source_id).pause();
                window.is_show_video = false;
            } else {
                showLogin();
            }
        }
    };

    $('.page-admin').show();

    $('.modal-cancel').click(function(){
        $(this).closest('.modal-shadow').hide();
    });
    $('.modal-close').click(function(){
        $(this).closest('.modal-shadow').hide();
    });

    $('a.local-link').click(function() {
        if($(this).attr('href') == '.page-admin .presentation') {
            $.ajax({
                url: window.robot_config.presentation.media,
                type: 'HEAD',
                success: function () {
                    showPresentation();
                    window.robot_spell.send(window.robot_config.presentation.text);
                },
                error: function () {
                    $('.presentation').hide();
                    window.robot_spell.send('`/z');
                }
            });
        } else if($(this).attr('href') != '') {
            $('.kiki-admin-panel').hide();
            $($(this).attr('href')).show();
        }
        if($(this).hasClass('wifi-back-link')) {
            $(this).attr('href', '.page-wifi-list');
        }
        return false;
    });

    function loginConfirm() {
        var login = $('.modal-login').closest('.modal-login').find('.login').val();
        var password = $('.modal-login').closest('.modal-login').find('.password').val();
        $.getJSON('robot_config.json?_=' + new Date().getTime())
            .done(function(json) {
                var robot_config = json;
                if((robot_config.login == login) && (robot_config.password == password)) {
                    $('.modal-login').hide();
                    $('.kiki-admin-panel').hide();
                    $('.page-admin').show();
                    $('.modal-login').closest('.modal-login').find('.password').val('');
                    window.is_page_media = false;
                    //$(document).unbind('touchstart');
                    //$(document).unbind('touchend');
                }
            })
            .fail(function(jqxhr, textStatus, error) {
                console.log('Can`t load "robot_config.json": ' + textStatus + ", " + error);
            });
    };

    $('.modal-login .modal-confirm').click(loginConfirm);

    $('.modal-login').keypress(function(e) {
        if (e.keyCode == $.ui.keyCode.ENTER) {
            loginConfirm();
        }
    });

    // Загрузка конфигурации робота

    // Загрузка адресов служебных серверов
    $.getJSON('robot_address.json?_=' + new Date().getTime())
        .done(function(json) {
            window.config = json;
            console.log(JSON.stringify(json));

            // Инициализация говорилки
            $.getJSON(window.config.settings_url + '?_=' + new Date().getTime())
                .done(function(json) {
                    window.settings = json;
                    loadConfig();
                    window.spell_socket = new InitRoomService(json);
                    window.alarms = new Alarms(window.settings.responces.alarm_clocks.clocks, showImageByAlarm);
                    // Проверить наличие картинок
                    for (var i in window.settings.responces.alarm_clocks.clocks) {
                        $.ajax({
                            url: window.settings.responces.alarm_clocks.clocks[i].pic,
                            type: 'GET',
                            error: function() {
                                // Удалить ссылку на картинку из настроек будильника
                                console.log('Can`t load :"' + window.settings.responces.alarm_clocks.clocks[i].pic + '"');
                                window.settings.responces.alarm_clocks.clocks[i].pic = '';
                                saveJson(window.config.json_save_url, window.config.settings_save_path, JSON.stringify(window.settings));
                            },
                            success: function(){}
                        });
                    }
                })
                .fail(function(jqxhr, textStatus, error) {
                    console.log('Try load local settings.json');
                    $.getJSON(window.config.local_settings_url + '?_=' + new Date().getTime())
                        .done(function(json) {
                            window.settings = json;
                            loadConfig();
                            window.spell_socket = new InitRoomService(json);
                            window.alarms = new Alarms(window.settings.responces.alarm_clocks.clocks, showImageByAlarm);
                            // Проверить наличие картинок
                            for (var i in window.settings.responces.alarm_clocks.clocks) {
                                $.ajax({
                                    url: window.settings.responces.alarm_clocks.clocks[i].pic,
                                    type: 'GET',
                                    error: function() {
                                        // Удалить ссылку на картинку из настроек будильника
                                        console.log('Can`t load :"' + window.settings.responces.alarm_clocks.clocks[i].pic + '"');
                                        window.settings.responces.alarm_clocks.clocks[i].pic = '';
                                        saveJson(window.config.local_json_save_url, window.config.local_settings_save_path, JSON.stringify(window.settings));
                                    },
                                    success: function(){}
                                });
                            }
                        })
                        .fail(function(jqxhr, textStatus, error) {
                            console.log('Can`t load "' + window.config.local_settings_url + '": ' + textStatus + ", " + error);
                        });
                });

            $.getJSON(window.config.multimedia_url + '?_=' + new Date().getTime())
                .done(function(json) {
                    window.multimedia_files_url = window.config.multimedia_files_url.replace(/\/$/, '');
                    window.media = json;
                    drawMedia();
                })
                .fail(function(jqxhr, textStatus, error) {
                    $.getJSON(window.config.local_multimedia_url + '?_=' + new Date().getTime())
                        .done(function(json) {
                            window.multimedia_files_url = window.config.local_multimedia_files_url.replace(/\/$/, '');
                            window.media = json;
                            drawMedia();
                        })
                        .fail(function(jqxhr, textStatus, error) {
                            console.log('Can`t load "' + window.config.local_multimedia_url +'": ' + textStatus + ", " + error);
                        });
                    console.log('Can`t load "' + window.config.multimedia_url +'": ' + textStatus + ", " + error);
                });

            $.getJSON(window.config.presets_url + '?_=' + new Date().getTime())
                .done(function(json) {
                    window.presets = json;
                    drawPresets();
                })
                .fail(function(jqxhr, textStatus, error) {
                    console.log('Try load local presets.json');
                    $.getJSON(window.config.local_presets_url + '?_=' + new Date().getTime())
                        .done(function(json) {
                            window.presets = json;
                            drawPresets();
                        })
                        .fail(function(jqxhr, textStatus, error) {
                            console.log('Can`t load "' + window.config.local_presets_url + '": ' + textStatus + ", " + error);
                        });
                    console.log('Can`t load "' + window.config.presets_url + '": ' + textStatus + ", " + error);
                });

            function showImageByAlarm(id) {
                // Отобразить картинку
                if (window.settings.responces.alarm_clocks.clocks[id].pic != '') {
                    $('.kiki-admin-panel').hide();
                    $('.page-media').show();
                    window.is_page_media = true;
                    $.fancybox.open({href: window.settings.responces.alarm_clocks.clocks[id].pic});
                    setTimeout(function() {
                        $.fancybox.close();
                    }, window.robot_config.close_picture_timeout * 1000); // Приведение к милисекундам
                }
                // Озвучить сообщение
                if (window.settings.responces.alarm_clocks.clocks[id].msg != '') {
                    window.robot_spell.send(window.settings.responces.alarm_clocks.clocks[id].msg);
                }
                console.log(JSON.stringify(window.settings.responces.alarm_clocks.clocks[id]));
            };

            window.wifi_obj = new InitWifi();
            window.wifi_obj.status(function(wifi_status) {
                console.log('WIFI > status');
                window.wifi_status = wifi_status;
                drawWifiConnection();
                window.wifi_obj.list(function(json) {
                    console.log('WIFI > list');
                    window.wifi_list = json;
                    drawWifi();
                }, function() {
                    console.log('Can`t load wifi list.');
                });
            }, function() {
                window.wifi_status = {};
                console.log('Can`t load wifi status.');
            });

            if (window.config.automat_url) {
                $('#iframe_automat').attr('src', window.config.automat_url);
            }
        })
        .fail(function(jqxhr, textStatus, error) {
            console.log('!!!\nFATAL: can`t load "robot_address.json"\n!!!');
        });
});

function getWifiValue(val) {
    if (val) {
        return val;
    }
    return '';
}

function drawWifiConnection() {
    if (window.wifi_status.length) {
        var wifi = window.wifi_status[0];
        var device = wifi.device;
        var device_name =     getWifiValue(device.name);
        var wifi_channel=     getWifiValue(wifi.channel);
        var wifi_bitrate =    getWifiValue(wifi.bitrate);
        var wifi_quality =    getWifiValue(wifi.quality);
        var wifi_ssid =       getWifiValue(wifi.ssid);
        var wifi_mode =       getWifiValue(wifi.mode);
        var wifi_bssid =      getWifiValue(wifi.bssid);
        var wifi_encryption = getWifiValue(wifi.encryption);
        var wifi_device =
            '<a href=".page-wifi-list" class="local-link"><button class="btn-kiki-default pull-right">Сканировать</button></a>' +
            '<div class="title pull-left">' + device_name + '</div>' +
            '<div class="attributes pull-left">Канал: <span class="chanel">' + wifi_channel + '</span> | Скорость: <span class="speed">' + wifi_bitrate + ' Мбит/с</span></div>';
        var wifi_connection =
            '<button id="wifi_delete_btn" class="btn-kiki-default pull-right">Удалить</button>' +
            '<button id="wifi_connection_btn" class="btn-kiki-default pull-right">Отключить</button>' +
            '<div class="signal pull-left">' + wifi_quality + '%</div>' +
            '<div class="description pull-left">' +
            '   SSID: <span class="ssid">' + wifi_ssid + '</span> | Режим: <span class="mode">' + wifi_mode + '</span><br>' +
            '   BSSID: <span class="bssid">' + wifi_bssid + '</span> | Шифрование: <span class="crypt">' + wifi_encryption + '</span>' +
            '</div>';
        $('#wifi-device').attr('wifi', wifi);
        $('#wifi-device').html(wifi_device);
        $('#wifi-connection').html(wifi_connection);

        $('a.local-link').unbind('click').click(function() {
            if($(this).attr('href') == '.page-admin .presentation') {
                $.ajax({
                    url: window.robot_config.presentation.media,
                    type: 'HEAD',
                    success: function () {
                        showPresentation();
                        window.robot_spell.send(window.robot_config.presentation.text);
                    },
                    error: function () {
                        $('.presentation').hide();
                        window.robot_spell.send('`/z');
                    }
                });
            } else if($(this).attr('href') != '') {
                $('.kiki-admin-panel').hide();
                $($(this).attr('href')).show();
            }
            if($(this).hasClass('wifi-back-link')) {
                $(this).attr('href', '.page-wifi-list');
            }
            return false;
        });
    }
}

function drawWifi() {
    console.log("drawWifi: " + JSON.stringify(window.wifi_list));
    var wifi_template = '';
    $('#carousel-wifi-list .carousel-inner').html('');
    wifi_template +=
        '<div class="carousel-inner" role="listbox">' +
        '   <div class="item active">' +
        '       <div class="kiki-wifi-wrapper">' +
        '           <div class="kiki-wifi-list">';
    $.each(window.wifi_list, function(key, wifi) {
        $('#wifi_connection_btn').attr("wifi", wifi);
        if(key % 7 == 0 && key >= 7) {
            wifi_template +=
                '           </div>' +
                '       </div>' +
                '   </div>' +
                '   <div class="item">' +
                '       <div class="kiki-wifi-wrapper">' +
                '           <div class="kiki-wifi-list">';
        }
        wifi_template +=
            '<div class="wifi white"> ' +
            '   <button class="btn-kiki-default pull-right wifi-connect" bssid="' + wifi.bssid + '" rel="' + wifi.device + '">Подключиться к сети</button>' +
            '   <div class="signal pull-left">' + wifi.quality + '</div>' +
            '   <div class="description pull-left">' +
            '       <div class="title">' + wifi.join + '</div>' +
            '       Channel: <span class="chanel">' + wifi.channel + '</span> | Mode: <span class="mode">' + wifi.mode + '</span> | BSSID: <span class="bssid">' + wifi.bssid + '</span> | Encryption: <span class="crypt">' + wifi.encription + '</span>' +
            '   </div>' +
            '</div>';
    });
    wifi_template +=
        '           </div>' +
        '       </div>' +
        '   </div>' +
        '</div>';
    $('#carousel-wifi-list .carousel-inner').html(wifi_template);
    $('#carousel-wifi-list').carousel();

    $('#wifi_delete_btn').click(function() {
        console.log('wifi_delete_btn');
        window.wifi_obj.remove(function(json) {
            console.log(JSON.stringify(json));
        });
    });

    $('#wifi_connection_btn').click(function() {
        console.log('wifi_connection_btn');
        window.wifi_obj.connect($('#wifi_connection_btn').attr("wifi"), function(json) {
            console.log(JSON.stringify(json));
        });
    });

    $('.wifi-connect').unbind('click').click(function(){
        $('.page-wifi-list').hide();
        console.log('wifi-connect id: '+ $(this).attr('rel'));
        $('.page-wifi-connect').attr('rel', $(this).attr('rel'));
        $('#wifi_chbox').prop('checked', false);
        $('#ESSID').val($(this).attr('bssid'));
        $('#WPA_password').val('');
        $('.page-wifi-connect').show();
    });

    $('.page-wifi-connect .btn-kiki-success').unbind('click').click(function() {
        if (window.wifi_obj) {
            var wifi = window.wifi_list[$('.page-wifi-connect').attr('rel')];
            console.log('wifi: '+ JSON.stringify(wifi));
            console.log('chbox: ' + $('#wifi_chbox').is(':checked'));
            console.log('ESSID: ' + $('#ESSID').val());
            console.log('WPA_password: ' + $('#WPA_password').val());
            var wifi_lson = {
                'settings':wifi,
                'ESSID': $('#ESSID').val(),
                'WPA': $('#WPA_password').val()
            };
            window.wifi_obj.connect(wifi_lson, function() {
                $('.page-wifi-list').show();
                $('.page-wifi-connect').hide();
            }, function() {
                console.log("WIFI ERROR.");
                $('.modal-wifi-error').show();
                $('.modal-wifi-error .modal-window').css('margin-top', -1 * $('.modal-login .modal-window').height() / 2);
                $('.modal-wifi-error .modal-close').unbind('click').click(function(){
                    $(this).closest('.modal-shadow').hide();
                });
                $('.modal-wifi-error .modal-confirm').unbind('click').click(function(){
                    $(this).closest('.modal-shadow').hide();
                });
            });
        }
    });
};


function drawPresets() {
    var voice_num = 0;
    var carousel_voice_item_num = 0;
    var carousel_voice_items = {};
    var animation_num = 0;
    var carousel_animation_item_num = 0;
    var carousel_animation_items = {};
    $.each(window.presets.all_presets, function(key_tab, presets_tab) {
        $.each(presets_tab.presets, function(key, preset) {
            if (voice_num % 4 == 0) {
                carousel_voice_item_num++;
                carousel_voice_items[carousel_voice_item_num] = [];
            }
            carousel_voice_items[carousel_voice_item_num].push(
                '<div class="command" tab-id="'+key_tab+'" preset-id="'+key+'">' +
                '   <div class="row">' +
                '       <div class="col-xs-6"><input class="editable input_preset_name" value="' + preset.name + '"></div>' +
                '       <div class="col-xs-3"><input class="editable input_preset_cmd" value="' + preset.cmd + '"></div>' +
                '       <div class="col-xs-3"><button class="btn-kiki-success" key_tab="'+key_tab+'" key="'+key+'">Enter</button></div>' +
                '       <div class="col-xs-12"><textarea class="editable description input_preset_message">' + preset.message + '</textarea></div>' +
                '   </div>' +
                '</div>'
            );
            voice_num++;
        });
    });

    $('.page-voice .carousel-inner').html('');
    $.each(carousel_voice_items, function(key, item) {
        var template = '';
        template +=
            '<div class="item ' + ((key == 1) ? 'active' : '') + '">' +
            '   <div class="kiki-commands">';
        $.each(item, function(k, command) {
            template += command;
        });
        template +=
            '   </div>' +
            '</div">';
        $('.page-voice .carousel-inner').append(template);
    });

    $('.page-animation .carousel-inner').html('');
    $.each(carousel_animation_items, function(key, item) {
        var template = '';
        template +=
            '<div class="item ' + ((key == 1) ? 'active' : '') + '">' +
            '   <div class="kiki-commands">';
        $.each(item, function(k, command) {
            template += command;
        });
        template +=
            '   </div>' +
            '</div">';
        $('.page-animation .carousel-inner').append(template);
    });
    $('.carousel').carousel();

    $('.command .editable').change(function() {
        var tab_id = $(this).closest('.command').attr('tab-id');
        var preset_id = $(this).closest('.command').attr('preset-id');
        var name = $(this).closest('.command').find('.input_preset_name').val();
        var message = $(this).closest('.command').find('.input_preset_message').val();
        if (name.length) {
            window.presets.all_presets[tab_id].presets[preset_id].name = name;
        } else {
            $(this).closest('.command').find('.input_preset_name').val(window.presets.all_presets[tab_id].presets[preset_id].name);
        }
        if (message.length) {
            window.presets.all_presets[tab_id].presets[preset_id].message = message;
        } else {
            $(this).closest('.command').find('.input_preset_message').val(window.presets.all_presets[tab_id].presets[preset_id].message);
        }
        window.presets.all_presets[tab_id].presets[preset_id].cmd = $(this).closest('.command').find('.input_preset_cmd').val();
        saveJson(window.config.json_save_url, window.config.presets_save_path, JSON.stringify(window.presets));
        console.log(JSON.stringify(window.presets.all_presets[tab_id].presets[preset_id]));
    });

    $('.command .btn-kiki-success').click(function(){
        var key_tab= $(this).attr('key_tab');
        var key = $(this).attr('key');
        var preset = window.presets.all_presets[key_tab].presets[key];
        if (window.robot_spell) {
            window.robot_spell.send(preset.message + preset.cmd);
        }
        console.log(JSON.stringify(preset));
    });
}

function saveAlarms() {
    window.settings.responces.alarm_clocks.clocks = [];
    $('.kiki-alarms .alarm-list-content .row').each(function(){
        var clock = {
            hours: $(this).find('.input_edit_hours').val(),
            minutes: $(this).find('.input_edit_minutes').val(),
            repeat: $(this).find('.input_edit_repeat').val(),
            msg: $(this).find('.input_edit_msg').val(),
            pic: $(this).find('.input_edit_pic').val()
        };
        if(clock.hours < 0) {
            clock.hours = 0;
        }
        if(clock.hours > 23) {
            clock.hours = 23;
        }
        if(clock.minutes < 0) {
            clock.minutes = 0;
        }
        if(clock.minutes > 59) {
            clock.minutes = 59;
        }
        if(clock.repeat < 0) {
            clock.repeat = 0;
        }
        window.settings.responces.alarm_clocks.clocks.push(clock);
    });
    console.log(window.settings.responces.alarm_clocks.clocks);
    window.alarms.reset(window.settings.responces.alarm_clocks.clocks);
    saveJson(window.config.json_save_url, window.config.settings_save_path, JSON.stringify(window.settings));
}

function alarmActions() {
    $('.kiki-alarms .alarm-list-content input').unbind('change').change(function() {
        saveAlarms();
    });
    $('.kiki-alarms .alarm-list-content select').unbind('change').change(function() {
        saveAlarms();
    });
    $('.kiki-alarms .alarm-list-content .minus').unbind('click').click(function() {
        var value = $(this).closest(".number").find("input").val();
        if(1 * value - 1 >= 0) {
            $(this).closest(".number").find("input").val(1 * value - 1);
        }
        saveAlarms();
    });
    $('.kiki-alarms .alarm-list-content .plus').unbind('click').click(function() {
        var value = $(this).closest(".number").find("input").val();
        var max_value = $(this).closest(".number").find("input").attr("max-value");
        if((1 * max_value == 0) || (1 * max_value >= 1 * value + 1)) {
            $(this).closest(".number").find("input").val(1 * value + 1);
        }
        saveAlarms();
    });
}

function drawAlarms() {
    if(window.robot_config.apply_alarms) {
        $('#apply_alarms').prop('checked', true);
    }
    if(window.robot_config.apply_events) {
        $('#apply_events').prop('checked', true);
    }
    $('.keyboard_joystick').prop('checked', false);
    $('.keyboard_joystick.'+window.robot_config.keyboard_joystick).prop('checked', true);

    $('.joystick input').unbind('change').change(function(){
        if($(this).hasClass('keyboard_joystick')) {
            window.robot_config.keyboard_joystick = $(this).attr('id');
        } else {
            window.robot_config[$(this).attr('id')] = $(this).prop('checked');
        }
        saveJson(window.config.json_save_url, "alfa_robot/robot_config.json", JSON.stringify(window.robot_config));
    });

    var template = '';
    $('.kiki-alarms .alarm-list-content').html('');
    $.each(window.settings.responces.alarm_clocks.clocks, function(key, alarm){
        template +=
            '<div class="row">' +
            '   <div class="col-xs-6">' +
            '       <div class="number col-xs-2">' +
            '           <span class="minus"></span>' +
            '           <input type="text" class="input_edit_hours text-center" value="' + addZero(alarm.hours) + '" max-value="23" placeholder="00">' +
            '           <span class="plus"></span>' +
            '       </div>' +
            '       <div class="col-xs-1 text-center"> : </div>' +
            '       <div class="number col-xs-2">' +
            '           <span class="minus"></span>' +
            '           <input type="text" class="input_edit_minutes col-xs-2 text-center" max-value="59" value="' + addZero(alarm.minutes) + '" placeholder="00">' +
            '           <span class="plus"></span>' +
            '       </div>' +
            '       <div class="col-xs-3 text-center"> repeate </div>' +
            '       <div class="number col-xs-2">' +
            '           <span class="minus"></span>' +
            '           <input type="text" class="input_edit_repeat col-xs-2 text-center" max-value="1000" value="' + addZero(alarm.repeat) + '" placeholder="00">' +
            '           <span class="plus"></span>' +
            '       </div>' +
            '       <div class="col-xs-2 text-left">  min</div>' +
            '   </div>' +
            '   <div class="col-xs-2">' +
            '       <input type="text" class="input_edit_msg col-xs-12 pull-left" value="' + alarm.msg + '">' +
            '   </div>' +
            '   <div class="col-xs-2">' +
            '           <select class="input_edit_pic col-xs-12 pull-left">' +
            '               <option value=""></option>';
        $.each(window.media, function(key, file) {
            template +=
                '               <option value="'+window.multimedia_files_url+'/'+file+'" '+((alarm.pic == window.multimedia_files_url+'/'+file)?'selected':'')+'>'+file+'</option>';
        });
        template +=
            '           </select>' +
            '   </div>' +
            '   <div class="col-xs-2">' +
            '       <button class="btn-kiki-danger col-xs-12 delete-alarm pull-right" onClick="$(this).closest(\'.row\').remove(); saveAlarms();">Delete</button>' +
            '   </div>' +
            '</div>';
    });
    $('.kiki-alarms .alarm-list-content').html(template);

    $('.kiki-alarms .add-alarm').unbind('click').click(function(){
        template = '';
        template +=
            '<div class="row">' +
            '   <div class="col-xs-6">' +
            '       <div class="number col-xs-2">' +
            '           <span class="minus"></span>' +
            '           <input type="text" class="input_edit_hours text-center" max-value="23" value="" placeholder="00">' +
            '           <span class="plus"></span>' +
            '       </div>' +
            '       <div class="col-xs-1 text-center"> : </div>' +
            '       <div class="number col-xs-2">' +
            '           <span class="minus"></span>' +
            '           <input type="text" class="input_edit_minutes col-xs-2 text-center" max-value="59" value="" placeholder="00">' +
            '           <span class="plus"></span>' +
            '       </div>' +
            '       <div class="col-xs-3 text-center"> repeate </div>' +
            '       <div class="number col-xs-2">' +
            '           <span class="minus"></span>' +
            '           <input type="text" class="input_edit_repeat col-xs-2 text-center" max-value="0" value="" placeholder="00">' +
            '           <span class="plus"></span>' +
            '       </div>' +
            '       <div class="col-xs-2 text-left">  min</div>' +
            '   </div>' +
            '   <div class="col-xs-2">' +
            '       <input type="text" class="input_edit_msg col-xs-12 pull-left" value="">' +
            '   </div>' +
            '   <div class="col-xs-2">' +
            '           <select class="input_edit_pic col-xs-12 pull-left">' +
            '               <option value=""></option>';
        $.each(window.media, function(key, file) {
            template +=
                '               <option value="'+window.multimedia_files_url+'/'+file+'">'+file+'</option>';
        });
        template +=
            '           </select>' +
            '   </div>' +
            '   <div class="col-xs-2">' +
            '       <button class="btn-kiki-danger col-xs-12 delete-alarm pull-right" onClick="$(this).closest(\'.row\').remove(); saveAlarms();">Delete</button>' +
            '   </div>' +
            '</div>';
        $('.kiki-alarms .alarm-list-content').append(template);
        alarmActions();
    });
    alarmActions();
}

function appendVideoPlayer(sw_id, file_url, type) {
    //file_url = 'http://localhost:63342/alfa_robot/media/1.mp4';
    //var w = 1270;
    //var h = 710;
    var video_content =
        '<div id="player-' + sw_id + '" class="video-player">' +
        '   <video id="source-' + sw_id + '" loop="" width="auto" height="auto" scrolling="no">' +
        '       <source src="' + file_url + '?_=' + new Date().getTime() + '" type="video/' + type + '">' +
        '   </video>' +
        '</div>';
    $('body').append(video_content);
    console.log('CREATE: player-' + sw_id);
}

function showVideo(sw_id) {
    window.show_video_id = 'player-' + sw_id;
    window.show_video_source_id = 'source-' + sw_id;
    console.log('OPEN: ' + window.show_video_id);
    $('#' + window.show_video_id).show();
    var sv = document.getElementById(window.show_video_source_id);
    sv.load();
    sv.play();
    window.is_show_video = true;
}

function drawMedia() {
    $('.page-media .pictures').html('');
    console.log(JSON.stringify(window.media));
    var mcount = 0;
    $.each(window.media, function(key, file) {
        var ext = file.match(/\..+/gi)[0].toLowerCase();
        var file_url = window.multimedia_files_url + '/' + file;
        var type = ext.substr(1, ext.length);
        ++mcount;
        if (ext == '.mp4' || ext == '.avi') {
            console.log('VIDEO: ' + file_url);
            $('.page-media .pictures').append('<a id="video-' + mcount + '" class="show-video" onclick="showVideo(\'video-' + mcount + '\')"><img src="img/play.png"></a>');
            appendVideoPlayer(('video-' + mcount), file_url, type);
        } else if(ext == '.jpg' || ext == '.png') {
            console.log('IMAGE: ' + file_url);
            $('.page-media .pictures').append('<a class="show-big" href="' + file_url + '"><img src="' + file_url + '"></a>');
        }
    });

    $('.show-big').fancybox({
        afterLoad: function(current, previous) {
            console.log('open img');
            setTimeout(function() {
                $.fancybox.close();
                console.log('close img - 5 sec');
            }, window.robot_config.close_picture_timeout * 1000);
        }
    });
}

window.onclose = function() {
    window.spell_socket.close();
};
