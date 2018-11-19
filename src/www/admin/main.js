/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Редактор голосовых ответов и событий робота.
 * \author Величко Ростислав
 * \date   26.04.2016
 */

var _config;

UTILS.LoadJSON('admin_config.json', function() {
    _server_socket = new WebSocket(_config.wifi_server_url);

    // Объмен с сервером wifi
    _server_socket.onmessage = function(e) {
        console.log("recv " + e.data);
        var json = JSON.parse(e.data);

        if ('list' in json) {
            var list = json['list'];
            for(var wifi in list) {
                addWiliLine(list[wifi]);
                console.log(list[wifi]);
            }
        } else if ('connect' in json) {
            console.log('connect id: ' + json['connect']);
        } else if ('disconnect' in json) {
            console.log('disconnect id: ' + json['connect']);
        } else if ('error' in json) {
            console.log('Error: ' + json['error']);
        }
    };

    // Подключиться к серверу wifi
    _server_socket.onopen = function(evt) {
        var now = new Date();
        var json = {
            cmd: 'list',
            date: now.toISOString()
        };
        _server_socket.send(JSON.stringify(json));
        console.log("send " + JSON.stringify(json));
    };
});


function addWiliLine(str) {
    var pannel = document.getElementById('wifi_list_pannel');
    var line = document.createElement("DIV");
    pannel.appendChild(line);
    line.setAttribute("class", "border");
}