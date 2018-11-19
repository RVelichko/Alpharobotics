/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


/**
 * var config = {
 *     video: video_tag,
 *     width: video_width,
 *     height: video_height,
 *     time_interval: 1000,
 *     onFrame: onFrame
 * }
 */
CaptureFrame = function(config) {
    var _canvas = document.createElement('canvas');
    _canvas.width  = config.width;
    _canvas.height = config.height;
    var _context = _canvas.getContext('2d');
    var _time_interval;

    function SepiaFilter(img_data) {
        // получаем одномерный массив, описывающий все пиксели изображения
        var pixels = img_data.data;
        // циклически преобразуем массив, изменяя значения красного, зеленого и синего каналов
        for (var i = 0; i < pixels.length; i += 4) {
            var r = pixels[i];
            var g = pixels[i + 1];
            var b = pixels[i + 2];
            pixels[i]     = (r * 0.393)+(g * 0.769)+(b * 0.189); // red
            pixels[i + 1] = (r * 0.349)+(g * 0.686)+(b * 0.168); // green
            pixels[i + 2] = (r * 0.272)+(g * 0.534)+(b * 0.131); // blue
        }
        return img_data;
    };

    this.init = function() {
        _time_interval = setInterval(function() {
            if (typeof config.video !== 'undefined') {
                // Отрисовать на канвасе текущий кадр видео
                _context.drawImage(config.video, 0, 0, config.width, config.height);
                var img_data = _context.getImageData(0, 0, config.width, config.height);
                img_data = SepiaFilter(img_data);
                _context.putImageData(img_data, 0, 0);
                // Получить data: url изображения c canvas
                var base64_data_url = _canvas.toDataURL('image/png');
                // Убрать все кастомные трансформации canvas
                _context.setTransform(1, 0, 0, 1, 0, 0);
                // На этом этапе можно отправить base64_data_url на сервер
                if (config.onFrame) {
                    config.onFrame(base64_data_url);
                }
            }
        }, (typeof config.time_interval !== 'undefined') ? config.time_interval : 3000);
    };

    this.stop = function() {
        if (_time_interval) {
            clearInterval(_time_interval);
            _time_interval = undefined;
        }
    }
};


/**
 * var config = {
 *     onFrame: onFrame,
 *     cam_id: cam_id,
 *     video_tag: video_tag,
 *     time_interval: time_interval
 * };
 */
StreamFramer = function(config) {
    var _capture_frame;

    function onError(error) {
        if (config.onError) {
            config.onError(error);
        }
        console.log('ERROR: Can`t start frames reading for top camera. "' + error + '"');
    }

    function onFrame(base64_data) {
        if (config.onFrame) {
            config.onFrame(base64_data);
        }
    }

    if (config.video_tag) {
        console.log('StreamFramer');
        // Запустить обработку видео
        var capture_config = {
            video: config.video_tag,
            width: config.video_tag.width,
            height: config.video_tag.height,
            time_interval: config.time_interval,
            onFrame: onFrame
        };
        _capture_frame = new CaptureFrame(capture_config);
        _capture_frame.init();
    }

    this.stop = function() {
        if (_capture_frame) {
            _capture_frame.stop();
            _capture_frame = null;
        }
    }
};


/**
 * var config = {
 *     framer_url: framer_url,
 *     room_id: room_id,
 *     name: name,
 *     time_interval: time_interval,
 *     video_devices: video_devices,
 *     video_top: video_top,
 *     video_bottom: video_bottom
 * };
 */
RobotFramer = function(config) {
    var _self = this;
    var _sig_url = config.framer_url; // 'ws://localhost:20005/rest/robot/frame';
    var _room_id = config.room_id + '_frames'; // '12345';
    var _sender_name = config.name; //'Operator KIKI Developer';
    var _frames = [];
    var _top_streamer;
    var _bottom_streamer;

    var _sign_sock = new SignalingSocket({
        signaling_url: _sig_url,
        room_id: _room_id,
        sender_name: _sender_name,
        onError: onReconnect,
        onClose: onReconnect,
        onOpen: onOpen,
        onMssage: onMessage
    });

    function onTopFrame(base64_data) {
        var frame = {
            frame:{
                id: _frames[0].id,
                base64_data: base64_data
            }
        };
        _sign_sock.send(frame);
        //console.log('Top > ' + _frames[0].id);
    }

    function onBottomFrame(base64_data) {
        var frame = {
            frame:{
                id: _frames[1].id,
                base64_data: base64_data
            }
        };
        _sign_sock.send(frame);
        //console.log('Bottom > ' + _frames[1].id);
    }

    function onOpen() {
        if (config.stream_devices) {
            console.log('Framer onOpen');
            _frames = [];
            var frames_candodates = [];
            var devices = config.stream_devices.getDevices();
            for (var i in devices) {
                var device = devices[i];
                if (device.kind === 'videoinput') {
                    var frame = {
                        arr_id: device.arr_id,
                        deviceid: device.deviceid,
                        facing: device.facing,
                        id: device.id,
                        kind: device.kind,
                        label: device.label
                    };
                    console.log('Framer video device: ' + JSON.stringify(frame));
                    frames_candodates.push(frame);
                }
            }
            /// Выбрать запрошенные устройства, если указано.
            if (config.need_devices) {
                for (var ndi in config.need_devices) {
                    _frames.push(config.need_devices[ndi]);
                }
            } else {
                _frames = frames_candodates;
            }
            // Передать в комнату доступные устройства
            console.log('Robot > frames: ' + JSON.stringify(_frames));
            _sign_sock.send({
                frames: _frames
            });

            if (0 < _frames.length) {
                /// Получить список стримов.
                var sds = config.stream_devices.getStreamDevices();

                // Запуск потока для top камеры
                var sdi = config.stream_devices.getStreamIdByDevicesId(_frames[0].id);
                if (sdi !== false) {
                    var top_stream_dev = sds[sdi];
                    console.log('Robot top frame: ' + JSON.stringify(top_stream_dev));
                    var sf_config = {
                        onFrame: onTopFrame,
                        video_tag: top_stream_dev.tag,
                        time_interval: config.time_interval
                    };
                    _top_streamer = new StreamFramer(sf_config);
                }
            }

            if (1 < _frames.length) {
                // Запуск потока для bottom камеры
                var sdi = config.stream_devices.getStreamIdByDevicesId(_frames[1].id);
                if (sdi !== false) {
                    var bottom_stream_dev = sds[sdi];
                    console.log('Robot bottom frame: ' + JSON.stringify(bottom_stream_dev));
                    var sf_config = {
                        onFrame: onBottomFrame,
                        video_tag: bottom_stream_dev.tag,
                        time_interval: config.time_interval
                    };
                    _bottom_streamer = new StreamFramer(sf_config);
                }
            }
        }
    }

    function onMessage(json) {
        // Получить список запрошенных устройств для вещания
        if ('room_id' in json && json.room_id === _room_id && 'msg' in json) {
            var msg = json.msg;
            if (msg === 'room_busy') {
            }
        }
    }

    function onReconnect() {
        console.log('Robot frames: onReconnect');
        setTimeout(function() {
            _sign_sock.connect();
        }, 3000);
    }

    _sign_sock.connect();
};
