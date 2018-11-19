InitWifi = function(init_callback) {
    var _socket;// = new WebSocket(window.config.wifi_url);
    var _status_func;
    var _list_func;
    var _error_func;
    var _connect_func;
    var _disconnect_func;
    var _remove_func;

    //_socket.onopen = function(e) {
    //    console.log('wifi socket onopen');
    //    if (init_callback) {
    //        init_callback();
    //    }
    //};

    function onerror(e) {
        console.log('onerror: ' + e.data);
        _socket.close();
    };

    function onclose(e) {
        console.log('onclose: ' + e.data);
        _socket.close();
    };

    function onmessage(e) {
        var json = JSON.parse(e.data);
        console.log("WIFI > " + JSON.stringify(json));
        if ('status' in json) {
            if (_status_func) {
                _status_func(json.status);
                _status_func = undefined;
                return;
            }
        }
        if ('list' in json) {
            if (_list_func) {
                _list_func(json.list);
                _list_func= undefined;
                return;
            }
        }
        if ('connect' in json) {
            if (_connect_func) {
                _connect_func(json.list);
                _connect_func = undefined;
                return;
            }
        }
        if ('disconnect' in json) {
            if (_disconnect_func) {
                _disconnect_func(json.list);
                _disconnect_func = undefined;
                return;
            }
        }
        if ('remove' in json) {
            if (_remove_func) {
                _remove_func(json.list);
                _remove_func = undefined;
                return;
            }
        }
        if(_error_func) {
            _error_func();
            _error_func = undefined;
        }
        _socket.close();
    };

    this.list = function(callback, err_calback) {
        console.log('WIFI <  list');
        _list_func = callback;
        _error_func = err_calback;
        _socket = new WebSocket(window.config.wifi_url);
        _socket.onopen = function(e) {
            var json = {
                cmd: 'list'
            };
            _socket.send(JSON.stringify(json));
        };
        _socket.onerror = onerror;
        _socket.onclose = onclose;
        _socket.onmessage = onmessage;
    };

    this.status = function(callback, err_calback) {
        console.log('WIFI <  status');
        _status_func = callback;
        _error_func = err_calback;
        _socket = new WebSocket(window.config.wifi_url);
        _socket.onopen = function(e) {
            var json = {
                cmd: 'status'
            };
            _socket.send(JSON.stringify(json));
        };
        _socket.onerror = onerror;
        _socket.onclose = onclose;
        _socket.onmessage = onmessage;
    };

    this.disconnect = function(wifi, callback, err_calback) {
        console.log('WIFI <  disconnect');
        _disconnect_func = callback;
        _error_func = err_calback;
        _socket = new WebSocket(window.config.wifi_url);
        _socket.onopen = function(e) {
            var json = {
                cmd: 'disconnect',
                wifi: wifi
            };
            _socket.send(JSON.stringify(json));
        };
        _socket.onerror = onerror;
        _socket.onclose = onclose;
        _socket.onmessage = onmessage;
    };

    this.connect = function(wifi, callback, err_calback) {
        console.log('WIFI <  connect');
        _connect_func = callback;
        _error_func = err_calback;
        _socket = new WebSocket(window.config.wifi_url);
        _socket.onopen = function(e) {
            var json = {
                cmd: 'connect',
                wifi: wifi
            };
            _socket.send(JSON.stringify(json));
        };
        _socket.onerror = onerror;
        _socket.onclose = onclose;
        _socket.onmessage = onmessage;
    };

    this.remove = function(callback, err_calback) {
        console.log('WIFI <  remove');
        _remove_func = callback;
        _error_func = err_calback;
        _socket = new WebSocket(window.config.wifi_url);
        _socket.onopen = function(e) {
            var json = {
                cmd: 'remove'
            };
            _socket.send(JSON.stringify(json));
        };
        _socket.onerror = onerror;
        _socket.onclose = onclose;
        _socket.onmessage = onmessage;
    };
};
