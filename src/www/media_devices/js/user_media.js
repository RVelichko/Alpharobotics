/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


navigator.getUserMedia = (navigator.getUserMedia ||
navigator.webkitGetUserMedia ||
navigator.mozGetUserMedia ||
navigator.msGetUserMedia);
window.URL = window.URL || window.webkitURL;


function UserMedia(config) {
    function onSuccess(stream) {
        if (config.onSuccess) {
            config.onSuccess({
                id: (typeof config.id !== 'undefined') ? config.id : 0,
                stream: stream
            });
        }
        if (config.onAllStreamsComplete) {
            config.onAllStreamsComplete();
        }
    }

    function onError(error) {
        if (config.onError) {
            config.onError({
                id: (typeof config.id !== 'undefined') ? config.id : 0,
                error: JSON.stringify(error)
            });
        }
    }

    if (navigator.getUserMedia) {
        var mic_id = config.mic_id;
        var cam_id = config.cam_id;
        var constraints = {
            audio: (mic_id !== false && mic_id !== true) ? {optional: [{sourceId: mic_id}]} : mic_id,
            video: (cam_id !== false && cam_id !== true) ? {
                mandatory: {
                    minWidth: 320,
                    minHeight: 240,
                    maxWidth: 1920,
                    maxHeight: 1089,
                    maxFrameRate: 30
                },
                optional: [{sourceId: cam_id}]
            } : cam_id
        };
        //console.log('New Media stream: ' + JSON.stringify(constraints));
        navigator.getUserMedia(constraints, onSuccess, onError);
    } else {
        console.log("getUserMedia not supported");
    }
}
