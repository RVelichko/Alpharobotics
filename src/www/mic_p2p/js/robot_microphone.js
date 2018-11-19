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
MicAnswerPeer = function(config) {
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
                console.log('Answer Stream Ended [' + config.peer_id + '] < ' + JSON.stringify(remote_stream));
                config.onRemoreStreamEnded({
                    peer_id: config.peer_id,
                    stream: this
                });
            }
        };
        if (config.onRemoreStream) {
            console.log('Answer NEW Stream [' + config.peer_id + '] < ' + JSON.stringify(remote_stream));
            config.onRemoreStream({
                peer_id: config.peer_id,
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


RobotMic = function(config) {
    if (typeof window.PeerController === 'undefined') {
        new GlobalPeerController();
    }

    var _self = this;
    var _sig_url = config.signaling_url; // 'ws://localhost:20004/rest/operator';
    var _room_id = config.room_id + '_mic'; // '12345';
    var _sender_name = config.name; //'Operator KIKI Developer';
    var _devices = [];
    var _peers = [];

    var _sign_sock = new SignalingSocket({
        signaling_url: _sig_url,
        room_id: _room_id,
        sender_name: _sender_name,
        onopen_callback: onOpen,
        onmessage_callback: onMessage
    });

    function onOpen() {
        // Получить список доступных устройств на роботе после передачи информации о себе
        _sign_sock.send({
            cmd: 'devices'
        });
        console.log('Robot mic open');
    }

    function defaultDevices(devices) {
        // Получить, отдельные по типам, комплекты устройств
        var audio_devices = [];
        var i;
        for (i in devices) {
            var device = devices[i];
            if (device.kind === 'audioinput') {
                audio_devices.push(device);
            }
        }
        // Сформировать комплект стримов
        var need_devices = [];
        for (i in audio_devices) {
            var audio_device = audio_devices[i];
            need_devices.push({
                peer_id: i,
                audio_device: audio_device,
                video_device: false
            });
        }
        // Выбрать первый из найденных микрофон
        if (need_devices.length && audio_devices.length) {
            var need_device = need_devices[0];
            need_device.audio_device = audio_devices[0];
        }
        console.log('Robot choose streams:');
        for (i in need_devices) {
            console.log(' * ' + JSON.stringify(need_devices[i]));
        }
        return need_devices;
    }

    function onRemoteStream(event) {
        console.log('Robot remote stream [' + event.peer_id + '] > ' + JSON.stringify(event.stream));
        var tag;
        if (event.peer_id == 0) {
            tag = document.getElementById('audio_id');
            tag.src = URL.createObjectURL(event.stream);
            tag.play();
        }
    }

    function onRemoteStreamEnded(event) {
        console.log('Robot on stream end [' + event.peer_id + '] > ' + JSON.stringify(event.stream));
    }

    function onMessage(json) {
        // Получить список запрошенных устройств для вещания
        if ('room_id' in json && json.room_id == _room_id && 'msg' in json) {
            var msg = json.msg;
            if ('devices' in msg) {
                var devices = msg.devices;
                console.log('Robot < ' + JSON.stringify(devices));
                // Сэмулировать выбор устройств
                _devices = defaultDevices(devices);
                // Отправить настройки роботу
                _sign_sock.send({
                    devices: _devices
                });
                console.log('Robot > devices' + JSON.stringify(_devices));
            }
            if ('peer' in msg)  {
                var peer = msg.peer;
                if ('sdp' in peer.msg && 'peer_id' in peer) {
                    console.log('Robot < remote SDP [' + peer.peer_id + ']'); //: ' + JSON.stringify(msg));
                    var peer_config = {
                        peer_id: peer.peer_id,
                        offerSDP: peer.msg,
                        send: _sign_sock.send,
                        onRemoreStream: onRemoteStream,
                        onRemoreStreamEnded: onRemoteStreamEnded
                    };
                    var p = new MicAnswerPeer(peer_config);
                    _peers[peer_config.peer_id] = p;
                }
                if ('ice' in peer.msg && 'peer_id' in peer) {
                    console.log('Robot < remote ICE [' + peer.peer_id + ']: ' + JSON.stringify(peer.msg.ice));
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
