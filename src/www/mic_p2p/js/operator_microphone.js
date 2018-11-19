/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


/**
 * var peer_config = {
 *     id: peer_id
 *     send: _signalling_socket.send
 * };
 */
MicOfferPeer = function(config) {
    var _peer = window.PeerController.createPeer();

    _peer.onicecandidate = function(event) {
        if (event && event.candidate) {
            var new_ice = {
                ice:{
                    sdpMLineIndex: event.sdpMLineIndex,
                    sdpMid: event.sdpMid,
                    candidate: event.candidate
                }
            };
            console.log('Offer ICE [' + config.peer_id + '] > ' + JSON.stringify(new_ice.ice));
            send(new_ice);
        }
    };

    this.createOffer = function() {
        _peer.createOffer(function(offer) {
            _peer.setLocalDescription(offer, function() {}, function(err) { console.log('!!! ERR setLocalDesc'); });
            console.log('Offer SDP [' + config.peer_id + '] > ' + JSON.stringify(offer));
            send(offer);
        }, function() {}, window.PeerController.getMediaConstrains());
    };

    this.addStream = function(media_stream) {
        _peer.addStream(media_stream);
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

    this.addAnswerSDP = function(answerSDP) {
        var answer = new window.SessionDescription(answerSDP);
        _peer.setRemoteDescription(answer, function() {}, function() {});
    };

    this.onStreamSuccess = function(stream) {
        console.log('Robot Add stream [' + config.peer_id + ']: ' + JSON.stringify(stream));
        _peer.addStream(stream);
        _peer.createOffer();
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


OperatorMic = function(config) {
    if (typeof window.PeerController === 'undefined') {
        new GlobalPeerController();
    }

    var _self = this;
    var _sig_url = config.signaling_url; // 'ws://localhost:20004/rest/operator';
    var _room_id = config.room_id + '_mic'; // '12345';
    var _sender_name = config.name; //'Operator KIKI Developer';
    var _peers = [];
    var _devices = [];
    var _need_devices = [];

    var _sign_sock = new SignalingSocket({
        signaling_url: _sig_url,
        room_id: _room_id,
        sender_name: _sender_name,
        onopen_callback: onOpen,
        onmessage_callback: onMessage
    });

    function onOpen() {
        // Получить список доступных устройств
        checkDeviceSupport(function() {
            _devices = [];
            function addDevice(device) {
                device.arr_id = _devices.length;
                _devices.push(device);
            }
            MediaDevices.forEach(addDevice);
            // Передать в комнату доступные устройства
            _sign_sock.send({
                devices: _devices
            });
            console.log('Operator > devices: ' + JSON.stringify(_devices));
        });
    }

    function onStreamSuccess(event) {
        var peer = _peers[event.peer_id];
        peer.addStream(event.stream);
        peer.createOffer();
        var device = _need_devices.pop();
        createPeer(device);
        console.log('Operator > peer: ' + JSON.stringify(peer));
    }

    function onStreamError(event) {
        console.log('ERROR [' + event.peer_id + ']: ' + event.error.name);
    }

    function createPeer(device) {
        if (typeof  device !== 'undefined') {
            console.log('Operator < ' + JSON.stringify(device));
            // Управление идентификаторами требуемых устройств
            var peer_id = _peers.length;
            if ('peer_id' in device) {
                peer_id = device.peer_id;
            }
            // Создать peer для запрошенных источников
            var peer_config = {
                peer_id: peer_id,
                send: _sign_sock.send
            };
            var peer = new MicOfferPeer(peer_config);
            _peers[peer_config.peer_id] = peer;
            // Сформировать комплект для подключения стримов
            var audio_device = (typeof device.audio_device !== 'undefined') ? device.audio_device : false;
            var video_device = false;
            var mic_id = (typeof audio_device.arr_id !== 'undefined') ? _devices[audio_device.arr_id].id : false;
            var cam_id = false;
            var dev_config = {
                peer_id: peer_config.peer_id,
                onSuccess: onStreamSuccess,
                onError: onStreamError,
                mic_id: mic_id,
                cam_id: cam_id
            };
            if (mic_id !== false) {
                UserMedia(dev_config);
            } else {
                console.log('ERR: Can`t find microphone!');
            }
        }
    }

    function onMessage(json) {
        // Получить список запрошенных устройств для вещания
        if ('room_id' in json && json.room_id === _room_id && 'msg' in json) {
            var msg = json.msg;
            if ('devices' in msg) {
                _need_devices = msg.devices.reverse();
                // Скрытый перебор принятого массива устройств - необъходим ввиду событийного процесса инициализации
                var device = _need_devices.pop();
                createPeer(device);
            }
            if ('peer' in msg) {
                var peer = msg.peer;
                if ('sdp' in peer.msg && 'peer_id' in peer) {
                    //console.log('Robot < remote SDP [' + peer.id + ']');
                    var p = _peers[peer.peer_id];
                    p.addAnswerSDP(peer.msg);
                }
                if ('ice' in peer.msg && 'peer_id' in peer) {
                    //console.log('Robot < remote ICE [' + peer.id + ']: ' + JSON.stringify(peer.msg.ice));
                    var p = _peers[peer.peer_id];
                    p.addRemoteICE(peer.msg);
                }
            }
        }
    }

    _sign_sock.connect();
};
