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
OfferPeer = function(config) {
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
            _peer.setLocalDescription(
                offer,
                function() {},
                function(err) {
                    console.log('!!! ERR setLocalDesc');
                });
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


RobotAutomat = function(config) {
    if (typeof window.PeerController === 'undefined') {
        new GlobalPeerController();
    }

    var _self = this;
    var _sig_url = config.signaling_url; // 'ws://localhost:20004/rest/operator';
    var _room_id = config.room_id; // '12345';
    var _sender_name = config.name; //'Operator KIKI Developer';
    var _peers = [];
    var _devices = [];
    var _need_devices = [];

    var _sign_sock = new SignalingSocket({
        signaling_url: _sig_url,
        room_id: _room_id,
        sender_name: _sender_name,
        onOpen: onOpen,
        onMessage: onMessage
    });

    function onOpen() {
        console.log('Robot automat: onOpen');
        if (config.stream_devices) {
            var devices = config.stream_devices.getDevices();
            _sign_sock.send({
                devices: devices
            });
        }
    }

    function createPeer(device) {
        if (device) {
            console.log('Robot < ' + JSON.stringify(device));

            /// Поиск соответствующего стрима.
            if (config.stream_devices) {
                var stream_devs = config.stream_devices.getStreamDevices();
                var dev_id = device.audio_device ? device.audio_device.id : (device.video_device ? device.video_device.id : false);
                var sdid = config.stream_devices.getStreamIdByDevicesId(dev_id);
                if (sdid !== false) {
                    var stream_dev = stream_devs[sdid];

                    /// Найти пир для имеющегося стрима.
                    var peer = _peers[device.peer_id];
                    if (!peer) {
                        // Создать peer для запрошенных источников
                        var peer_config = {
                            peer_id: device.peer_id,
                            send: _sign_sock.send
                        };
                        peer = new OfferPeer(peer_config);
                        _peers[device.peer_id] = peer;
                    }
                    peer.addStream(stream_dev.stream);
                    peer.createOffer();
                }
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
                for (var di in _need_devices) {
                    var device = _need_devices[di];
                    createPeer(device);
                }
            }
            if ('peer' in msg) {
                var peer = msg.peer;
                if ('sdp' in peer.msg && 'peer_id' in peer) {
                    console.log('Robot < remote SDP [' + peer.id + ']');
                    var p = _peers[peer.peer_id];
                    p.addAnswerSDP(peer.msg);
                }
                if ('ice' in peer.msg && 'peer_id' in peer) {
                    console.log('Robot < remote ICE [' + peer.id + ']: ' + JSON.stringify(peer.msg.ice));
                    var p = _peers[peer.peer_id];
                    p.addRemoteICE(peer.msg);
                }
            }
        }
    }

    _sign_sock.connect();
};
