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

    this.init = function() {
        _time_interval = setInterval(function() {
            if (typeof config.video !== 'undefined') {
                // переворачиваем canvas зеркально по горизонтали
                //_context.translate(_canvas.width, 0);
                //_context.scale(-1, 1);
                // Отрисовать на канвасе текущий кадр видео
                _context.drawImage(config.video, 0, 0, config.width, config.height);
                // Получить data: url изображения c canvas
                var base64_data_url = _canvas.toDataURL('image/png');
                // Убрать все кастомные трансформации canvas
                //_context.setTransform(1, 0, 0, 1, 0, 0);
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
    var _stream;
    var _capture_frame;

    function onError(error) {
        console.log('ERROR: Can`t start frames reading for top camera. "' + error + '"');
    }

    function onFrame(base64_data) {
        if (config.onFrame) {
            config.onFrame(base64_data);
        }
    }

    function onSuccess(event) {
        // устанавливаем как источник для video
        _stream = event.stream;
        config.video_tag.src = URL.createObjectURL(_stream);
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

    // Запуск потока для top камеры
    var media_config = {
        mic_id: false,
        cam_id: config.cam_id,
        onSuccess: onSuccess,
        onError: onError
    };
    UserMedia(media_config);

    this.stop = function() {
        if (_capture_frame) {
            _capture_frame.stop();
        }
        if (_stream) {
            _stream.stop();
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
    var _sig_url = config.framer_url; // 'ws://localhost:20005/rest/robot/frame';
    var _room_id = config.room_id; // '12345';
    var _sender_name = config.name; //'Operator KIKI Developer';
    var _frames = [];
    var _top_streamer;
    var _bottom_streamer;

    var _sign_sock = new SignalingSocket({
        signaling_url: _sig_url,
        room_id: _room_id,
        sender_name: _sender_name,
        onOpen: onOpen,
        onMssage: onMessage
    });

    function onTopFrame(base64_data) {
        _sign_sock.send({
            frame:{
                id: _frames[0].id,
                base64_data: base64_data
            }
        });
    }

    function onBottomFrame(base64_data) {
        _sign_sock.send({
            frame:{
                id: _frames[1].id,
                base64_data: base64_data
            }
        });
    }

    function onOpen() {
        if (typeof config.video_devices !== 'undefined' && config.video_devices.length) {
            _frames = [];
            for (var i in config.video_devices) {
                var device = config.video_devices[i];
                _frames[i] = {
                    id: device.id
                }
            }
            // Передать в комнату доступные устройства
            _sign_sock.send({
                frames: _frames
            });
            console.log('Robot > frames: ' + JSON.stringify(_frames));

            // Запуск потока для top камеры
            var sf_config = {
                onFrame: onTopFrame,
                cam_id: _frames[0].id,
                video_tag: config.video_top,
                time_interval: config.time_interval
            };
            _top_streamer = new StreamFramer(sf_config);

            // Запуск потока для bottom камеры
            if (1 < config.video_devices.length) {
                var sf_config = {
                    onFrame: onBottomFrame,
                    cam_id: _frames[1].id,
                    video_tag: config.video_bottom,
                    time_interval: config.time_interval
                };
                _bottom_streamer = new StreamFramer(sf_config);
            }
        }
    }

    function onMessage(json) {
        // Получить список запрошенных устройств для вещания
        if ('room_id' in json && json.room_id === _room_id && 'msg' in json) {
            var msg = json.msg;
            if (msg === 'room_busy') {
                if (_top_streamer) {
                    _top_streamer.stop();
                }
                if (_bottom_streamer) {
                    _bottom_streamer.stop();
                }
            }
        }
    }

    _sign_sock.connect();

    this.stop = function() {
        if (_top_streamer) {
            _top_streamer.stop();
        }
        if (_bottom_streamer) {
            _bottom_streamer.stop();
        }
    }
};
