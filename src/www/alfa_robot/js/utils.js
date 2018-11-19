/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Набор утилит.
 * \author Величко Ростислав
 * \date   08.02.2016
 */

function setHeights() {
    $('.main.tab-pane').css('min-height', ($(window).height() - 56));
    $('.main.tab-pane.active').find('.log_pannel').height($('.main.tab-pane.active').find('.editor').height() - 32);
    $('.operator .chart-height').height($('.operator .etalon-height').height() - $('.operator .buttons-height').height() - 94);
    $('.operator .videos-height').height($('.operator .etalon-height').height() - 47);
}

function addZero(number) {
    if (number) {
        if (number.toString().length == 1) {
            return '0' + number;
        }
    } else {
        return '0';
    }
    return number;
}

function addLogMessage(type, message) {
    var date = new Date();
    var time =  addZero(date.getDate()) + '.' + addZero(date.getMonth() + 1) + '.' + date.getFullYear() + ' ' + addZero(date.getHours()) + ':' + addZero(date.getMinutes()) + ':' + addZero(date.getSeconds());
    $('.main.tab-pane.active').find('.log_pannel').append(
        '<div class="message">' +
        '<span class="time">' + time + '</span> - ' +
        '<span class="type">' + type + '</span> - ' +
        '<span class="message">' + message + '</span>' +
        '</div>'
    );
}

function saveJson(save_url, file_path, save_json) {
    var saver_socket = new WebSocket(save_url);
    saver_socket.onmessage = function(e) {
        console.log("recv " + e.data);
        var json = JSON.parse(e.data);
        saver_socket.close();
    };
    saver_socket.onopen = function(evt) {
        var json = {
            'path':file_path,
            'json':save_json
        };
        saver_socket.send(JSON.stringify(json));
        console.log("send " + JSON.stringify(json));
    };
    saver_socket.onerror = function(evt) {
    };
    saver_socket.onclose = function(evt) {
    };
}
