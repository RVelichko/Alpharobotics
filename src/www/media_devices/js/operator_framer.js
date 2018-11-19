/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


/**
 * var config = {
 *     framer_url: framer_url,
 *     room_id: room_id,
 *     name: name,
 *     canvas_top: canvas_top,
 *     canvas_bottom: canvas_bottom
 * }
 */
OperatorFramer = function(config) {
    var _self = this;
    var _sig_url = config.framer_url; // 'ws://localhost:20005/rest/operator/frame';
    var _room_id = config.room_id + '_frames'; // '12345';
    var _frames_funcs = [];

    var _sign_sock = new SignalingSocket({
        signaling_url: _sig_url,
        room_id: _room_id,
        sender_name: config.name,
        onError: onReconnect,
        onClose: onReconnect,
        onOpen: onOpen,
        onMessage: onMessage
    });

    function drawDataURIOnCanvas(str_data_URI, canvas) {
        var img = new window.Image();
        img.onload = function() {
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
        };
        img.src = str_data_URI;
    }

    function onTopFrame(base64_data) {
        drawDataURIOnCanvas(base64_data, config.canvas_top);
    }

    function onBottomFrame(base64_data) {
        drawDataURIOnCanvas(base64_data, config.canvas_bottom);
    }

    function onOpen() {
        var cvd = {
            cmd:'video_devices'
        };
        _sign_sock.send(cvd);
        console.log("Operator Framer > " + JSON.stringify(cvd));
    }

    function onMessage(json) {
        // Получить список запрошенных устройств для вещания
        if ('room_id' in json && json.room_id == _room_id && 'msg' in json) {
            var msg = json.msg;
            if ('video_devices' in msg) {
                var video_devices = msg.video_devices;
                console.log('Operator frames < ' + JSON.stringify(video_devices));
                _frames_funcs = [];
                var device;
                if (video_devices.length) {
                    var device = video_devices[0];
                    _frames_funcs[0] = {
                        id: device.id,
                        onFrame: onTopFrame
                    };
                }
                if (1 < video_devices.length) {
                    var device = video_devices[1];
                    _frames_funcs[1] = {
                        id: device.id,
                        onFrame: onBottomFrame
                    };
                }
            }
            if ('frame' in msg) {
                var frame = msg.frame;
                var fi = 0;
                for (var f in _frames_funcs) {
                    var frame_func = _frames_funcs[f];
                    if (frame_func.id === frame.id) {
                        frame_func.onFrame(frame.base64_data);
                        //console.log('Operator frame < ' + frame.id + ' [' + frame_func.id + ']');
                    }
                }
            }
        }
    }

    function onReconnect() {
        setTimeout(function() {
            _sign_sock.connect();
        }, 1000);
    }

    _sign_sock.connect();

    this.setFrames = function(video_devices) {
        _frames_funcs = [];
        var device;
        if (video_devices.length) {
            var device = video_devices[0];
            _frames_funcs[0] = {
                id: device.id,
                onFrame: onTopFrame
            };
        }
        if (1 < video_devices.length) {
            var device = video_devices[1];
            _frames_funcs[1] = {
                id: device.id,
                onFrame: onBottomFrame
            };
        }
    }
};
