function updateWindowSettings() {
    loadJSON("robot_address.json", function(response) {
        window_config = JSON.parse(response);
        saveJson(_config.json_save_url, _config.settings_save_path, JSON.stringify(window.settings));
        drawSettings();
    });
}

function drawSettinsModal(title, key_1, key_2, button) {
    $('.modal-edit-setting .modal-title span').text(title);
    var template = '<div class="settings_pannel setting_lines">';
    if(typeof window.settings.responces[key_1]['pic'] == 'undefined') {
        window.settings.responces[key_1]['pic'] = '';
    }
    template +=
        '   <div class="row border">' +
        '       <div class="col-xs-1">' +
        '           <img src="' + window.settings.responces[key_1]['pic'] + '">' +
        '       </div>' +
        '       <div class="col-xs-9">' +
        '           <input type="text" class="input_edit_pic col-xs-12 pull-left" value="' + window.settings.responces[key_1]['pic'] + '" placeholder="URL картинки события">' +
        '       </div>' +
        '   </div>';
    $.each(window.settings.responces[key_1][key_2], function(key, line){
        template +=
            '   <div class="row border">' +
            '       <div class="col-xs-10">' +
            '           <input type="text" class="input_edit col-xs-12 pull-left" value="' + line + '">' +
            '       </div>' +
            '       <div class="col-xs-2">' +
            '           <button class="btn btn-danger col-xs-12 delete-setting pull-right" onClick="$(this).closest(\'.row\').remove();">Удалить</button>' +
            '       </div>' +
            '   </div>';
    });
    template += '</div><div class="settings_pannel">';
    template +=
        '<div class="row">' +
        '   <div class="col-xs-12">' +
        '       <button id="add_regex_btn" class="btn btn-success add-setting pull-right"><i class="fa fa-plus"></i> Добавить</button>' +
        '   </div>' +
        '</div>';
    template += '</div>';
    $('.modal-edit-setting .modal-body').html(template);
    $('.modal-edit-setting .modal-body .row .add-setting').unbind('click').click(function(){
        $('.modal-edit-setting .modal-body .setting_lines').append(
            '   <div class="row border">' +
            '       <div class="col-xs-10">' +
            '           <input type="text" class="input_edit col-xs-12 pull-left" value="">' +
            '       </div>' +
            '       <div class="col-xs-2">' +
            '           <button class="btn btn-danger col-xs-12 delete-setting pull-right" onClick="$(this).closest(\'.row\').remove();">Удалить</button>' +
            '       </div>' +
            '   </div>'
        );
    });
    $('.modal-edit-setting .modal-confirm').unbind('click').click(function(){
        var newLines = [];
        $('.modal-edit-setting .modal-body .input_edit').each(function(){
            if($(this).val() != '') {
                newLines.push($(this).val());
            }
        });
        window.settings.responces[key_1][key_2] = newLines;
        window.settings.responces[key_1]['pic'] = $('.modal-edit-setting .modal-body .input_edit_pic').val();
        $(button).find('span').text(window.settings.responces[key_1][key_2].length);
        addLogMessage('edit', title);
        updateWindowSettings();
        $('.modal-edit-setting').hide();
    });
    $('.modal-edit-setting').show();
    $('.modal-edit-setting .modal-window').css('margin-top', -1 * $('.modal-edit-setting .modal-window').height() / 2);
}

function drawClocksModal(title, key_1, key_2, button) {
    $('.modal-edit-setting .modal-title span').text(title);
    var template = '<div class="settings_pannel setting_lines">';
    $.each(window.settings.responces[key_1][key_2], function(key, line){
        template +=
            '   <div class="row border">' +
            '       <div class="col-xs-5 row">' +
            '           <div class="col-xs-2"><input type="number" class="input_edit_hours col-xs-12 pull-left text-center" value="' + addZero(line.hours) + '" placeholder="00"></div>' +
            '           <div class="col-xs-2"><input type="number" class="input_edit_minutes col-xs-12 pull-left text-center" value="' + addZero(line.minutes) + '" placeholder="00"></div>' +
            '           <div class="col-xs-8"><input type="text" class="input_edit_msg col-xs-10 pull-left" value="' + line.msg + '"></div>' +
            '       </div>' +
            '       <div class="col-xs-5 row">' +
            '           <div class="col-xs-2"><img src="' + line.pic + '"></div>' +
            '           <div class="col-xs-10"><input type="text" class="input_edit_pic col-xs-12 pull-left" value="' + line.pic + '" placeholder="URL картинки события"></div>' +
            '       </div>' +
            '       <div class="col-xs-2">' +
            '           <button class="btn btn-danger col-xs-12 delete-setting pull-right" onClick="$(this).closest(\'.row\').remove();">Удалить</button>' +
            '       </div>' +
            '   </div>';
    });
    template += '</div><div class="settings_pannel">';
    template +=
        '<div class="row">' +
        '   <div class="col-xs-12">' +
        '       <button id="add_regex_btn" class="btn btn-success add-setting pull-right"><i class="fa fa-plus"></i> Добавить</button>' +
        '   </div>' +
        '</div>';
    template += '</div>';
    $('.modal-edit-setting .modal-body').html(template);
    $('.modal-edit-setting .modal-body .row .add-setting').unbind('click').click(function(){
        $('.modal-edit-setting .modal-body .setting_lines').append(
            '   <div class="row border">' +
            '       <div class="col-xs-5 row">' +
            '           <div class="col-xs-2"><input type="number" class="input_edit_hours col-xs-12 pull-left text-center" value="" placeholder="00"></div>' +
            '           <div class="col-xs-2"><input type="number" class="input_edit_minutes col-xs-12 pull-left text-center" value="" placeholder="00"></div>' +
            '           <div class="col-xs-8"><input type="text" class="input_edit_msg col-xs-12 pull-left" value=""></div>' +
            '       </div>' +
            '       <div class="col-xs-5 row">' +
            '           <div class="col-xs-2"><img src=""></div>' +
            '           <div class="col-xs-10"><input type="text" class="input_edit_pic col-xs-12 pull-left" value="" placeholder="URL картинки события"></div>' +
            '       </div>' +
            '       <div class="col-xs-2">' +
            '           <button class="btn btn-danger col-xs-12 delete-setting pull-right" onClick="$(this).closest(\'.row\').remove();">Удалить</button>' +
            '       </div>' +
            '   </div>'
        );    
        $('.input_edit_hours').on('change', function(){
	    var value = $(this).val();
	    if(value < 0) {
	        value = 0;
	    }
	    if(value > 23) {
	    	value = 23;
	    }
	    $(this).val(value);
        });
        $('.input_edit_minutes').on('change', function(){
	    var value = $(this).val();
	    if(value < 0) {
	        value = 0;
	    }
	    if(value > 60) {
	        value = 60;
	    }
	    $(this).val(value);
        });
    });
    $('.input_edit_hours').on('change', function(){
	var value = $(this).val();
	if(value < 0) {
	    value = 0;
	}
	if(value > 23) {
		value = 23;
	}
	$(this).val(value);
    });
    $('.input_edit_minutes').on('change', function(){
	var value = $(this).val();
	if(value < 0) {
	    value = 0;
	}
	if(value > 60) {
	    value = 60;
	}
	$(this).val(value);
    });
    $('.modal-edit-setting .modal-confirm').unbind('click').click(function(){
        var newLines = [];
        $('.modal-edit-setting .modal-body .row.border').each(function(){
            var clock = {
                hours: $(this).find('.input_edit_hours').val(),
                minutes: $(this).find('.input_edit_minutes').val(),
                msg: $(this).find('.input_edit_msg').val(),
                pic: $(this).find('.input_edit_pic').val()
            };
            if((clock.hours > 0) || (clock.minutes > 0) || (clock.msg != '') || (clock.pic != '')) {
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
                newLines.push(clock);
            }
        });
        window.settings.responces[key_1][key_2] = newLines;
        $(button).find('span').text(window.settings.responces[key_1][key_2].length);
        addLogMessage('edit', title);
        updateWindowSettings();
        $('.modal-edit-setting').hide();
    });
    $('.modal-edit-setting').show();
    $('.modal-edit-setting .modal-window').css('margin-top', -1 * $('.modal-edit-setting .modal-window').height() / 2);
}

function drawRegexpModal(regexp_regex) {
    var regexp = {
        pic: '',
        regex: '',
        resp: []
    };
    if(regexp_regex !== false) {
        $.each(window.settings.responces.regexes, function (key, reg) {
            if (reg.regex == regexp_regex) {
                regexp = reg;
            }
        });
    }
    console.log(regexp);
    $('.modal-edit-setting .modal-title span').text('Регулярные выражения');
    var template = '<div class="settings_pannel setting_lines">';
    if(typeof regexp.pic == 'undefined') {
        regexp.pic = '';
    }
    console.log(window.multimedia);
    template +=
        '   <div class="row border">' +
        '       <div class="col-xs-12">' +
        '           &nbsp;Для указания нескольких правил примените скобки со знаком "|", пример: "(привет)|(хай)"<br>' +
        '           <input type="text" class="input_edit_regex col-xs-12 pull-left" value="' + regexp.regex + '" placeholder="Регулярное выражение">' +
        '       </div>' +
        '   </div>';
    template +=
        '   <div class="row border">' +
        '       <div class="col-xs-2">' +
        '           &nbsp;URL картинки события:' +
        '       </div>' +
        '       <div class="col-xs-8">' +
        '           <select class="input_edit_pic col-xs-12 pull-left">' +
        '               <option value=""></option>';
    $.each(window.multimedia, function(key, file) {
        template +=
            '               <option value="'+window.multimedia_files_url+file+'" '+((regexp.pic == window.multimedia_files_url+file)?'selected':'')+'>'+file+'</option>';
    });
    template +=
        '           </select>' +
        '       </div>' +
        '       <div class="col-xs-2">' +
        '           <img src="' + regexp.pic + '">' +
        '       </div>' +
        '   </div>';
    $.each(regexp.resp, function(key, line){
        template +=
            '   <div class="row border">' +
            '       <div class="col-xs-10">' +
            '           <input type="text" class="input_edit col-xs-12 pull-left" value="' + line + '">' +
            '       </div>' +
            '       <div class="col-xs-2">' +
            '           <button class="btn btn-danger col-xs-12 delete-setting pull-right" onClick="$(this).closest(\'.row\').remove();">Удалить</button>' +
            '       </div>' +
            '   </div>';
    });
    template += '</div><div class="settings_pannel">';
    template +=
        '<div class="row">' +
        '   <div class="col-xs-12">' +
        '       <button id="add_regex_btn" class="btn btn-success add-setting pull-right"><i class="fa fa-plus"></i> Добавить</button>' +
        '   </div>' +
        '</div>';
    template += '</div>';
    $('.modal-edit-setting .modal-body').html(template);
    $('.modal-edit-setting .modal-body .row .add-setting').unbind('click').click(function(){
        $('.modal-edit-setting .modal-body .setting_lines').append(
            '   <div class="row border">' +
            '       <div class="col-xs-10">' +
            '           <input type="text" class="input_edit col-xs-12 pull-left" value="">' +
            '       </div>' +
            '       <div class="col-xs-2">' +
            '           <button class="btn btn-danger col-xs-12 delete-setting pull-right" onClick="$(this).closest(\'.row\').remove();">Удалить</button>' +
            '       </div>' +
            '   </div>'
        );
    });
    $('.modal-edit-setting .modal-confirm').unbind('click').click(function() {
        var updatedKey = window.settings.responces.regexes.length;
        if(regexp_regex !== false) {
            $.each(window.settings.responces.regexes, function (key, reg) {
                if (reg.regex == regexp_regex) {
                    updatedKey = key;
                }
            });
        } else {
            $.each(window.settings.responces.regexes, function (key, reg) {
                if (reg.regex == $('.modal-edit-setting .input_edit_regex').val()) {
                    updatedKey = key;
                }
            });
        }

        var newRegexp = {
            regex: $('.modal-edit-setting .input_edit_regex').val(),
            pic: $('.modal-edit-setting .input_edit_pic').val()
        };
        var newLines = [];
        $('.modal-edit-setting .modal-body .input_edit').each(function(){
            if($(this).val() != '') {
                newLines.push($(this).val());
            }
        });
        newRegexp.resp = newLines;

        if(updatedKey == window.settings.responces.regexes.length) {
            addRegexp(newRegexp);
            setHeights();
            addLogMessage('new', newRegexp.regex);
        } else {
            addLogMessage('edit', newRegexp.regex);
        }
        window.settings.responces.regexes[updatedKey] = newRegexp;
        updateWindowSettings();
        $('.modal-edit-setting').hide();
    });
    $('.modal-edit-setting').show();
    $('.modal-edit-setting .modal-window').css('margin-top', -1 * $('.modal-edit-setting .modal-window').height() / 2);
}

function deleteRegexp(regexp_regex) {
    $(".modal-delete .modal-message").text('Вы действительно хотите удалить "' + regexp_regex + '"?');
    $(".modal-delete .modal-confirm").unbind('click').click(function(){
        var newRegexps = [];
        $.each(window.settings.responces.regexes, function (key, reg) {
            if (reg.regex != regexp_regex) {
                newRegexps.push(reg);
            }
        });
        window.settings.responces.regexes = newRegexps;
        $('#regexes_lines_pannel .row').each(function(){
            if ($(this).find('.input_edit').val() == regexp_regex) {
                $(this).remove();
            }
        });
        addLogMessage('delete', regexp_regex);
        updateWindowSettings();
        setHeights();
        $(".modal-delete").hide();
    });
    $(".modal-delete").show();
}

function drawSettings() {
    $('#regexes_lines_pannel').html('');

    if(typeof window.settings.responces.misunderstand_perc == 'undefined') {
        window.settings.responces.misunderstand_perc = {perc: 70, pic: '', resp: []};
    }
    $('#misunderstand_perc_number').val(window.settings.responces.misunderstand_perc.perc);
    $('#misunderstand_perc_btn span').text(window.settings.responces.misunderstand_perc.resp.length);

    $('#misunderstand_perc_number').on('change', function(){
        var value = $(this).val();
        if(value < 0) {
            value = 0;
        }
        if(value > 100) {
            value = 100;
        }
        $(this).val(value);
        addLogMessage('edit', 'Проценты распознавания речи клиента');
        window.settings.responces.misunderstand_perc.perc = value;
        updateWindowSettings();
    });
    $('#misunderstand_perc_btn').click(function(){
        drawSettinsModal('Речь клиента не распознана', 'misunderstand_perc', 'resp', '#misunderstand_perc_btn');
    });

    if(typeof window.settings.responces.misunderstand == 'undefined') {
        window.settings.responces.misunderstand = {pic: '', msg: []};
    }
    $('#misunderstand_btn span').text(window.settings.responces.misunderstand.msg.length);

    $('#misunderstand_btn').click(function(){
        drawSettinsModal('Ключевые фразы клиента', 'misunderstand', 'msg', '#misunderstand_btn');
    });

    if(typeof window.settings.responces.spell_timeout == 'undefined') {
        window.settings.responces.spell_timeout = {time: 10, pic: '', msg: []};
    }
    $('#spell_timeout_number').val(window.settings.responces.spell_timeout.time);
    $('#spell_timeout_btn span').text(window.settings.responces.spell_timeout.msg.length);

    $('#spell_timeout_number').on('change', function(){
        var value = $(this).val();
        if(value < 0) {
            value = 0;
        }
        if(value > 999) {
            value = 999;
        }
        $(this).val(value);
        addLogMessage('edit', 'Таймер речи клиента');
        window.settings.responces.spell_timeout.time = value;
        updateWindowSettings();
    });

    $('#spell_timeout_btn').click(function(){
        drawSettinsModal('Речь клиента превысила таймер', 'spell_timeout', 'msg', '#spell_timeout_btn');
    });

    if(typeof window.settings.responces.timeout == 'undefined') {
        window.settings.responces.timeout = {sleep: 15, pic: '', msg: []};
    }
    $('#timeout_number').val(window.settings.responces.timeout.sleep);
    $('#timeout_btn span').text(window.settings.responces.timeout.msg.length * 1);

    $('#timeout_number').on('change', function(){
        var value = $(this).val();
        if(value < 0) {
            value = 0;
        }
        if(value > 999) {
            value = 999;
        }
        $(this).val(value);
        addLogMessage('edit', 'Таймер молчания клиента');
        window.settings.responces.timeout.sleep = value;
        updateWindowSettings();
    });

    $('#timeout_btn').click(function(){
        drawSettinsModal('Молчание клиента превысило таймер', 'timeout', 'msg', '#timeout_btn');
    });

    if(typeof window.settings.responces.alarm_clocks == 'undefined') {
        window.settings.responces.alarm_clocks = {pic: '', clocks: []};
    }
    $('#alarm_clocks_btn span').text(window.settings.responces.alarm_clocks.clocks.length);

    $.each(window.settings.responces.regexes, function(key, regexp) {
        addRegexp(regexp);
    });

    $('#alarm_clocks_btn').click(function() {
        drawClocksModal('Будильники', 'alarm_clocks', 'clocks', '#alarm_clocks_btn');
    });

    $('#add_regex_btn').click(function() {
        drawRegexpModal(false);
    });
}

function addRegexp(regexp) {
    var template =
        '<div class="row border">' +
        '   <div class="col-xs-12">' +
        '       <input type="text" class="input_edit pull-left" value="' + regexp.regex + '" readonly>' +
        '       <button class="btn btn-info pull-left" onClick="drawRegexpModal(\'' + regexp.regex + '\');"><div class="ellipsis">' + regexp.resp[0] + '</div></button>' +
        '       <button class="btn btn-danger pull-left" onClick="deleteRegexp(\'' + regexp.regex + '\');"><div class="ellipsis">Удалить</div></button>' +
        '   </div>' +
        '</div>';
    $('#regexes_lines_pannel').append(template);
}

$(document).ready(function() {
    loadJSON("robot_address.json", function(response) {
        window.config = JSON.parse(response);
        // Загрузка пресетов
        loadJSON(window.config.settings_url, function(response) {
            console.log("settings: " + window.config.settings_url);
            window.settings = JSON.parse(response);
            drawSettings();
        });
    });
});