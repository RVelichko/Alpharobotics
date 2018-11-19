/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


StreamDevices = function(config) {
    var _self = this;
    var _sd_ids = [];
    var _candidates = [];
    var _stream_devices = [];
    var _devices = [];
    var _err_count = 0;

    function getDeviceById(dev_id_) {
        for (var di = 0; di < _devices.length; ++di) {
            var device = _devices[di];
            if (device.id === dev_id_) {
                return device;
            }
        }
        return false;
    }

    function onStreamSuccess(result_) {
        if (result_.id < _sd_ids.length) {
            var sd = _sd_ids[result_.id];
            var camera = getDeviceById(sd.cam_devi);
            var microphone = getDeviceById(sd.mic_devi);
            if (camera || microphone) {
                /// Добавить объект для видео вреймов.
                var tag;
                if (camera) {
                    tag = document.createElement('VIDEO');
                    tag.setAttribute('width', '320px');
                    tag.setAttribute('height', '240px');
                    tag.setAttribute('autoplay', 'autoplay');
                    tag.volume = 0.0;
                    tag.src = URL.createObjectURL(result_.stream);
                    tag.load();
                    console.log('New VIDEO tag ' + sd.cam_devi);
                }
                /// Сформировать стрим устройство.
                var stream_device = {
                    microphone: microphone,
                    camera: camera,
                    stream: result_.stream,
                    tag: tag
                };
                console.log('Inited stream: ' + result_.id + ': ' + JSON.stringify(stream_device) + ' [' + (_stream_devices.length + _err_count) + ':' + _candidates.length + ']');
                /// Добавить стрим.
                _stream_devices.push(stream_device);
                /// Обработать внешние функции.
                if (config.onSuccess) {
                    config.onSuccess(stream_device);
                }
                if ((_stream_devices.length + _err_count) === _candidates.length) {
                    config.onComplete(_self);
                }
            } else {
                onStreamError('Can`t find devices by sd id.');
            }
        } else {
            onStreamError('Udefined media identifier');
        }
    }

    function onStreamError(e_) {
        ++_err_count;
        console.log('ERR: ' + JSON.stringify(e_));
        if (config.onError) {
            config.onError(e_);
        }
        if ((_stream_devices.length + _err_count) === _candidates.length) {
            config.onComplete(_self);
        }
    }

    function initStream(candidate_) {
        var i = _sd_ids.length;
        var sd = {
            mic_devi: candidate_.mic_id,
            cam_devi: candidate_.cam_id
        };
        _sd_ids.push(sd);
        var md_config = {
            id: i,
            onSuccess: onStreamSuccess,
            onError: onStreamError,
            mic_id: candidate_.mic_id,
            cam_id: candidate_.cam_id
        };
        //console.log('Init stream dev: ' + i + '-> m:' + candidate_.mic_id + ', c:' + candidate_.cam_id);
        UserMedia(md_config);
    }

    /// Получить список доступных устройств
    checkDeviceSupport(function() {
        MediaDevices.forEach(function(device) {
            var dev = {
                arr_id: _devices.length,
                deviceid: device.deviceid,
                groupid: device.groupid,
                id: device.id,
                kind: device.kind,
                label: device.label
            };
            _devices.push(dev);
            console.log('Find Robot device: ' + JSON.stringify(dev));
        });

        // Выделить микрофоны и камеры
        var cams = [];
        var mics = [];
        for (var di in _devices) {
            var dev = _devices[di];
            if (dev.kind === 'audioinput') {
                mics.push({
                    di: di,
                    dev:dev
                });
            }
            if (dev.kind === 'videoinput') {
                cams.push({
                    di: di,
                    dev:dev
                });
            }
        }

        /// Сформировать список кандидатов.
        for (var mi = 0; mi < mics.length; ++mi) {
            _candidates.push({
                mic_id: mics[mi].dev.id,
                cam_id: false
            });
        }

        for (var ci = 0; ci < cams.length; ++ci) {
            _candidates.push({
                mic_id: false,
                cam_id: cams[ci].dev.id
            });
        }

        /// Проинициализировать отдельные стримы
        for (var i in _candidates) {
            initStream(_candidates[i]);
        }
    });

    this.getStreamDevices = function() {
        return _stream_devices;
    };

    this.getDevices = function() {
        return _devices;
    };

    this.getStreamIdByDevicesId = function(devi_) {
        for(var si = 0; si < _stream_devices.length; ++si) {
            var sd = _stream_devices[si];
            var mic_devi = sd.microphone.id ? sd.microphone.id : false;
            var cam_devi = sd.camera.id ? sd.camera.id : false;
            /// Найти нужный стрим по идентификатору устройства.
            if (devi_ === mic_devi || devi_ === cam_devi) {
                return si;
            }
        }
        return false;
    }
};
