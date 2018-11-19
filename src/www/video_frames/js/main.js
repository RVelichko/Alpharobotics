/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


window.onload = function () {
    var _framer_url = 'ws://localhost:20005/rest/frames';
    var _room_id = 'framer_debug';
    var time_interval = 1000;

    var devices = [];
    checkDeviceSupport(function() {
        // Получить список доступных устройств
        MediaDevices.forEach(function (device) {
            device.arr_id = devices.length;
            devices.push(device);
        });

        // Получить список видеоустройств
        var video_devices = [];
        for (i in devices) {
            var device = devices[i];
            if (device.kind === 'videoinput') {
                video_devices.push(device);
            }
        }

        // Запуск robota на трансляцию фреймов
        var video_top = document.createElement('VIDEO');
        video_top.setAttribute('width', '320px');
        video_top.setAttribute('height', '240px');
        video_top.setAttribute('autoplay', 'autoplay');
        var video_bottom = document.createElement('VIDEO');
        video_bottom.setAttribute('width', '320px');
        video_bottom.setAttribute('height', '240px');
        video_bottom.setAttribute('autoplay', 'autoplay');
        var robot_config = {
            framer_url: _framer_url + '/robot',
            room_id: _room_id,
            name: 'debug robot',
            time_interval: time_interval,
            video_devices: video_devices,
            video_top: video_top,
            video_bottom: video_bottom
        };
        new RobotFramer(robot_config);

        // Запуск операторов на приём фреймов
        var operator_config = {
            framer_url: _framer_url + '/operator',
            room_id: _room_id,
            name: 'debug operator',
            canvas_top: document.getElementById('canvas_top_0'),
            canvas_bottom: document.getElementById('canvas_bottom_0')
        };
        new OperatorFramer(operator_config);

        var operator_config = {
            framer_url: _framer_url + '/operator',
            room_id: _room_id,
            name: 'debug operator',
            canvas_top: document.getElementById('canvas_top_1'),
            canvas_bottom: document.getElementById('canvas_bottom_1')
        };
        new OperatorFramer(operator_config);
    });
};
