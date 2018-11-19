/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


function uuid() {
    var s4 = function() {
        return Math.floor(Math.random() * 0x10000).toString(16);
    };
    return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}


SignalingSocket = function(config) {
    var _self = this;
    var _socket;

    if (typeof config.sender_name === 'undefined') {
        config.sender_name = uuid();
    }

    this.send = function(msg) {
        if (typeof config.room_id !== 'undefined') {
            _socket.send(JSON.stringify({
                room_id: config.room_id,
                name: config.sender_name,
                msg: msg
            }));
        } else {
            console.log('ERROR: room_id is undeclared.');
        }
    };

    this.connect = function() {
        if (typeof config.signaling_url !== 'undefined') {
            _socket = new WebSocket(config.signaling_url);
            _socket.onopen = function(e) {
                if (config.onOpen) {
                    //console.log('# sigsock onopen');
                    config.onOpen();
                }
            };
            _socket.onerror = function(e) {
                if (config.onError) {
                    config.onError();
                }
            };
            _socket.onclose = function(e) {
                if (config.onClose) {
                    config.onClose();
                }
            };
            _socket.onmessage = function(msg) {
                var json = JSON.parse(msg.data);
                if (config.onMessage) {
                    //console.log('# sigsock onmessage');
                    config.onMessage(json);
                }
            }
        }
    };
};
