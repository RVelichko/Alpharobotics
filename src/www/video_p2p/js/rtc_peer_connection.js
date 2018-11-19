/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


GlobalPeerController = function() {
    window.PeerController = this;
    window.PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    window.SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
    window.IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
    window.moz = !!navigator.mozGetUserMedia;
    var _chrome_version = !!navigator.mozGetUserMedia ? 0 : parseInt(navigator.userAgent.match( /Chrom(e|ium)\/([0-9]+)\./ )[2]);

    var _ice_servers = [];
    if (moz) {
        _ice_servers.push({
            url: 'stun:23.21.150.121'
        });

        _ice_servers.push({
            url: 'stun:stun.services.mozilla.com'
        });
    }
    if (!moz) {
        _ice_servers.push({
            url: 'stun:stun.l.google.com:19302'
        });
        _ice_servers.push({
            url: 'stun:stun.anyfirewall.com:3478'
        });
    }
    if (!moz && _chrome_version < 28) {
        _ice_servers.push({
            url: 'turn:homeo@turn.bistri.com:80',
            credential: 'homeo'
        });
    }
    if (!moz && _chrome_version >= 28) {
        _ice_servers.push({
            url: 'turn:turn.bistri.com:80',
            credential: 'homeo',
            username: 'homeo'
        });
        _ice_servers.push({
            url: 'turn:turn.anyfirewall.com:443?transport=tcp',
            credential: 'webrtc',
            username: 'webrtc'
        });
    }


    this.createPeer = function() {
        var PeerConnection = window.PeerConnection;
        var servers = {
            iceServers: _ice_servers
        };
        var optional = {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        };
        var peer = new PeerConnection(servers, optional);
        return peer;
    };

    this.getMediaConstrains = function() {
        return {
            optional: [],
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };
    };
};
