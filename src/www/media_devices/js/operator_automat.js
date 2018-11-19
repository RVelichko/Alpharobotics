/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */



/*
 * var config = {
 *     id: peer.id,
 *     offerSDP: offerSDP,
 *     send: _signalling_socket.send
 *     onRemoreStream: onRemoteStream,
 *     onRemoreStreamEnded: onRemoteStreamEnded
 * };
 */
AnswerPeer = function(config) {
    var _peer = window.PeerController.createPeer();
    var _gotFirstMediaStream = false;

    _peer.onicecandidate = function(event) {
        if (event && event.candidate) {
            var new_ice = {
                ice: {
                    sdpMLineIndex: event.sdpMLineIndex,
                    sdpMid: event.sdpMid,
                    candidate: event.candidate
                }
            };
            console.log('Answer ICE [' + config.peer_id + '] > ' + JSON.stringify(new_ice.ice));
            send(new_ice);
        }
    };

    var offerSDP = new SessionDescription(config.offerSDP);
    _peer.setRemoteDescription(offerSDP, function() {}, function() {console.log('!!! ERR Answer setRemoteDesc')});
    _peer.createAnswer(function(answerSDP) {
        _peer.setLocalDescription(answerSDP, function() {}, function() {});
        console.log('Answer SDP [' + config.peer_id + '] > ' + JSON.stringify(answerSDP));
        send(answerSDP);
    }, function() {}, window.PeerController.getMediaConstrains());

    var gotFirstMediaStream = true;

    _peer.onaddstream = function(event) {
        var remote_stream = event.stream;
        remote_stream.onended = function() {
            if (config.onRemoreStreamEnded) {
                console.log('Answer Stream Ended [' + config.peer_id + '] < ' + JSON.stringify(event));
                config.onRemoreStreamEnded({
                    peer_id: config.peer_id,
                    device_type: config.device_type,
                    stream: this
                });
            }
        };
        if (config.onRemoreStream) {
            console.log('Answer NEW Stream [' + config.peer_id + '] < ' + JSON.stringify(event));
            config.onRemoreStream({
                peer_id: config.peer_id,
                device_type: config.device_type,
                stream: remote_stream
            });
        }
    };

    this.addRemoteICE = function(remoteICE) {
        var remote_ice = {
            sdpMLineIndex: remoteICE.ice.sdpMLineIndex,
            sdpMid: remoteICE.ice.sdpMid,
            candidate: remoteICE.ice.candidate
        };
        var ice = new IceCandidate(remote_ice.candidate);
        _peer.addIceCandidate(ice, function() {}, function() {});
    };

    function send(msg) {
        if (config.send) {
            if (typeof config.peer_id !== 'undefined') {
                config.send({
                    peer: {
                        peer_id: config.peer_id,
                        msg: msg
                    }
                });
            } else {
                config.send(msg)
            }
        }
    }
};


OperatorAutomat = function(config) {
    if (typeof window.PeerController === 'undefined') {
        new GlobalPeerController();
    }

    var _self = this;
    var _sig_url = config.signaling_url; // 'ws://localhost:20004/rest/operator';
    var _room_id = config.room_id; // '12345';
    var _sender_name = config.name; //'Operator KIKI Developer';
    var _devices = [];
    var _peers = [];

    var _sign_sock = new SignalingSocket({
        signaling_url: _sig_url,
        room_id: _room_id,
        sender_name: _sender_name,
        onOpen: onOpen,
        onMessage: onMessage
    });

    function onOpen() {
        // Получить список доступных устройств на роботе после передачи информации о себе
        _sign_sock.send({
            cmd: 'devices'
        });
    }

    function defaultDevices(devices) {
        // Получить, отдельные по типам, комплекты устройств
        var audio_devices = [];
        var video_devices = [];
        var i;
        for (i in devices) {
            var device = devices[i];
            if (device.kind === 'audioinput') {
                audio_devices.push(device);
            }
            if (device.kind === 'videoinput') {
                video_devices.push(device);
            }
        }
        // Выбрать первый из найденных микрофон, всегда должен быть с id = 0.
        var need_devices = [];
        var peer_id = 0;
        if (audio_devices.length) {
            var audio_device = audio_devices[peer_id];
            need_devices.push({
                peer_id: peer_id,
                audio_device: audio_device,
                video_device: false
            });
        }
        // Сформировать набор из первых двух камер.
        for (i in video_devices) {
            var video_device = video_devices[i];
            need_devices.push({
                peer_id: (++peer_id),
                audio_device: false,
                video_device: video_device
            });
        }
        console.log('Operator choose streams:');
        for (i in need_devices) {
            console.log(' * ' + JSON.stringify(need_devices[i]));
        }
        return need_devices;
    }

    function onRemoteStream(event) {
        console.log('Operator remote stream [' + event.peer_id + '] > ' + JSON.stringify(event));
        var tag;
        /// Формирование аудио потока.
        if (event.peer_id == 0) {
            tag = document.createElement('AUDIO');
            tag.setAttribute('autoplay', 'autoplay');
            tag.src = URL.createObjectURL(event.stream);
            tag.load();
        }
        /// Формирование отображения видео потоков.
        if (event.peer_id == 1) {
            tag = document.getElementById('video_top_id');
            tag.setAttribute('autoplay', 'autoplay');
            tag.src = URL.createObjectURL(event.stream);
            tag.load();
        }
        if (event.peer_id == 2) {
            tag = document.getElementById('video_bottom_id');
            tag.setAttribute('autoplay', 'autoplay');
            tag.src = URL.createObjectURL(event.stream);
            tag.load();
        }
    }

    function onRemoteStreamEnded(event) {
        console.log('Operator on stream end [' + event.peer_id + '] > ' + JSON.stringify(event.stream));
    }

    function onMessage(json) {
        // Получить список запрошенных устройств для вещания
        if ('room_id' in json && json.room_id == _room_id && 'msg' in json) {
            var msg = json.msg;
            if ('devices' in msg) {
                var devices = msg.devices;
                console.log('Operator < ' + JSON.stringify(devices));
                // Сэмулировать выбор устройств
                _devices = defaultDevices(devices);
                // Отправить настройки роботу
                _sign_sock.send({
                    devices: _devices
                });
                console.log('Operator > devices' + JSON.stringify(_devices));
            }
            if ('peer' in msg)  {
                var peer = msg.peer;
                if ('sdp' in peer.msg && 'peer_id' in peer) {
                    console.log('Operator < remote SDP [' + peer.peer_id + ']'); //: ' + JSON.stringify(msg));
                    var dev_type = _devices.length ? (_devices[peer.peer_id].video_device ? 'video_device' :
                                                                                            (_devices[peer.peer_id].audio_device ? 'audio_device' :
                                                                                                                                   false)) :
                                                     false;
                    var peer_config = {
                        peer_id: peer.peer_id,
                        offerSDP: peer.msg,
                        send: _sign_sock.send,
                        device_type: dev_type,
                        onRemoreStream: onRemoteStream,
                        onRemoreStreamEnded: onRemoteStreamEnded
                    };
                    var p = new AnswerPeer(peer_config);
                    _peers[peer_config.peer_id] = p;
                }
                if ('ice' in peer.msg && 'peer_id' in peer) {
                    console.log('Operator < remote ICE [' + peer.peer_id + ']: ' + JSON.stringify(peer.msg.ice));
                    if ('ice' in peer.msg) {
                        var p = _peers[peer.peer_id];
                        p.addRemoteICE(peer.msg);
                    }
                }
            }
        }
    }

    _sign_sock.connect();
};
