/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


document.onreadystatechange = function() {
    var _stream_devices;
    var _signaling_url = 'wss://mind05.alfarobotix.ru:30004/rest/signaling/';
    var _frames_url = 'wss://mind05.alfarobotix.ru:30005/rest/frames/';
    var _room_id = 'TEST_ROOM_ID';

    function onComplete(stream_devices_) {
        // {"arr_id":0,"id":"default","kind":"audioinput","label":"По умолчанию"}
        // {"arr_id":1,"id":"33428af87476d34a79da523f9b909f6adfff6702bda785f523bbc0e94857c63b","kind":"audioinput","label":"Встроенное аудио Аналоговый стерео"}
        // {"arr_id":2,"id":"5bb18e6a47b29146b5e8cdeef3d8a983d34bfe08861154bdbe9e370ed1ca7a91","kind":"audioinput","label":"Webcam C270 Аналоговый моно"}
        // {"arr_id":3,"id":"4145ac9b6ad8d05d7eb75321f52a9695220afe3919210e5d400c8b1233d5aafd","kind":"videoinput","label":"TOSHIBA Web Camera - FHD (10f1:1a42)"}
        // {"arr_id":4,"id":"c3f67eb5532f7ef274c30cba57c52ddd09b35b1f0ee7ae67438a928f39a3415a","kind":"videoinput","label":"UVC Camera (046d:0825) (046d:0825)"}
        //var si = stream_devices_.getStreamIdByDevicesId('default', '4145ac9b6ad8d05d7eb75321f52a9695220afe3919210e5d400c8b1233d5aafd');
        var sds = stream_devices_.getStreamDevices();
        // if (si && sds.length) {
        //     var sd = sds[si];
        //     console.log('SD {' + (sd.microphone.id ? sd.microphone.id : false) + ';' + (sd.camera.id ? sd.camera.id : false) + '}');
        // } else {
        //     console.log(JSON.stringify(sds));
        // }

        // var robot_source_div = document.getElementById('robot_source_id');
        // for (var i in sds) {
        //     var sd = sds[i];
        //     if (sd.camera) {
        //         robot_source_div.appendChild(sd.video_tag);
        //     }
        // }

        /// Запуск тестового робота - источника видео.
        new RobotAutomat({
            signaling_url: _signaling_url + 'robot',
            room_id: _room_id,
            name: "Robot Developer",
            stream_devices: stream_devices_
        });
        /// Запуск тестового оператора - потребителя видео.
        setTimeout(function() {
            new OperatorAutomat({
                signaling_url: _signaling_url + 'operator',
                room_id: _room_id,
                name: "Operator Developer"
            });
        }, 500);

        /// Запуск тестового робота - источника фреймов.
        new RobotFramer({
            framer_url: _frames_url + 'robot',
            room_id: _room_id,
            name: 'Robot Developer',
            time_interval: 1000,
            stream_devices: stream_devices_
        });
        /// Запуск тестового оператора - потребителя фреймов.
        setTimeout(function() {
            new OperatorFramer({
                framer_url: _frames_url + 'operator',
                room_id: _room_id,
                name: 'Robot Developer',
                canvas_top: document.getElementById('canvas_top'),
                canvas_bottom: document.getElementById('canvas_bottom')
            });
        }, 500);
    }

    if (document.readyState === 'complete') {
        _stream_devices = new StreamDevices({
            onComplete: onComplete
        });
    }
};
