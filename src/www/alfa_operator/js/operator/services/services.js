'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('collabAppServices', []).
    value('version', '0.1').
    factory('socket', function ($rootScope, $timeout, $log) {
        var socket_url = window.robot_address.automat_url;
        var socket = io.connect(socket_url, {
            'connect timeout': 1000,
            'reconnection delay': 0,
            'max reconnection attempts': 10*24*3600 //10 days
        });

        socket.on('reconnecting',function(delay, attempt){
            $log.info('Reconnecting to io host '+socket.socket.options.host+' in '+delay+' sec. Attempt '+attempt);
        });

        socket.on('connect_failed',function(){
            $log.info('Connection failed to io host '+socket.socket.options.host);
        });

        return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $timeout(function () {
                        callback.apply(socket, args);
                    }, 0);
                });
            },
            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                });
            },
            disconnect: function(){
                socket.disconnect();
            }
        };
    }).
    factory('Room', function ($rootScope, socket, $log, $http, $filter) {
        return {
            id: 'anonymousRoom',
            initialized: false,
            iceServers: [createIceServer('stun:stun.l.google.com:19302'), createIceServer('turn:turn.bistri.com:80','homeo','homeo')],
            connections: [],
            users: [],
            localstreams:[],
            remotestreams:[],
            remoteStreamOrder: [],
            findPeerByRole: function(role){
                var peer=null;
                for (var i in this.users){
                    if (this.users[i].role==role){
                        peer=this.users[i];
                        break;
                    }
                }
                return peer;
            },
            findConnectionByPeer: function (peerId){
                var connection;
                for (var i in this.connections){
                    if (this.connections[i].peer.id==peerId){
                        connection=this.connections[i];
                        break;
                    }
                }
                return connection;
            },
            join: function (roomId, myRole){
                //this.id=roomId;
                socket.emit('joinRoom', {
                    room: roomId,
                    role: myRole
                });

                this.init();
            },

            /**
             * Searches peer by socketId. Returns item from user array
             * @param socketId
             * @returns {*}
             */
            findPeer: function(socketId){
                var peer=null;
                for (var i in this.users){
                    if (this.users[i].id==socketId){
                        peer=this.users[i];
                        break;
                    }
                }
                return peer;
            },
            onStreamAdded: function(event){
                $log.info('Подключен удаленный поток', 'public');
                this.remotestreams.push(event.stream);
                if (!event) return;
                var streamIndex=this.remoteStreamOrder.indexOf(event.stream.id);
                streamIndex=(streamIndex!==-1) ? streamIndex : 0;
                $log.log('Stream '+event.stream.id+' is attached to place '+streamIndex);
                var el=angular.element('.remoteVideo').get(streamIndex) || $('<video class="remotevideo" autoplay="autoplay"></video>').appendTo('body').get(0);
                attachMediaStream(el, event.stream);
                var st=event.stream;
                var self=this;
                st.onended=function(){
                    self.remotestreams.splice(self.remotestreams.indexOf(st), 1);
                    $log.warn('Stream ended');
                };
            },
            onConnectionStateChange: function(peerConnection){
                $log.info('Статус подключения: '+ peerConnection.iceConnectionState, 'public');
                if (peerConnection.iceConnectionState=='disconnected'){
                    $log.warn('Room.onConnectionStateChange: connection disconnected');
                    //todo find connection in list and destroy
                    var connection=null,
                        index=0;
                    for (var i in this.connections){
                        if (this.connections[i].peerConnection==peerConnection){
                            connection=this.connections[i];
                            index=i;
                            break;
                        }
                    }
                    if (!connection){
                        //nothing to do - no such connection (too weird... who fired? already destroyed?)
                        $log.warn('Room.onConnectionStateChange: nothing to do - no such connection (too weird %))');
                        return;
                    }

                    if (connection.peer && connection.peer.role!=='viewer'){
                        connection.peerConnection.close();
                        this.connections.splice(index,1);
                    }
                    if (this.onCallEnd){
                        this.onCallEnd(connection.peer);
                    }
                }
                //todo connected state
                $rootScope.$apply();
            },
            callPeer: function (peer, onConnected){
                this.onConnected=onConnected || function (){};
                if (!peer){
                    $log.warn('Calling: no peer was given');
                }
                var self=this;

                var connection={
                    peer: peer,
                    peerConnection: new RTCPeerConnection({iceServers: this.iceServers})
                };
                this.connections.push(connection);
                //deprecated

                //this.peer=peer;
                //this.peerConnection=new RTCPeerConnection({iceServers: this.iceServers});
                connection.peerConnection.onicecandidate = function (event){
                    //$log.info('Onicecandidate: ice candidate mined');
                    if (!connection.peerConnection || !event || !event.candidate) return;
                    var candidate = event.candidate;
                    console.log(candidate.candidate);
                    //send to socket
                    socket.emit('iceCandidate',{to: connection.peer, candidate: event.candidate})
                };

                connection.peerConnection.onaddstream = function(event){
                    //todo connection step
                    $log.info('onaddstream: stream added');
                    self.onStreamAdded(event);
                };
                connection.peerConnection.oniceconnectionstatechange=function(){
                    self.onConnectionStateChange(this);
                };

                connection.dataChannel = connection.peerConnection.createDataChannel("sendDataChannel",{reliable: false});

                connection.dataChannel.onopen = function (event){
                    self.onDataChannelStateChange && self.onDataChannelStateChange(connection.dataChannel)
                };

                connection.dataChannel.onclose = function (event){
                    self.onDataChannelStateChange && self.onDataChannelStateChange(connection.dataChannel)
                };

                for (var i=0;i<this.localstreams.length; i++){
                    connection.peerConnection.addStream(this.localstreams[i]);
                }

                connection.peerConnection.createOffer(function (sessionDescription) {
                    console.log('SDP: ' + sessionDescription.sdp + '\ntype: ' + sessionDescription.type);
                    connection.peerConnection.setLocalDescription(sessionDescription);
                    //sending offer to peer
                    socket.emit('call', {peer: connection.peer.id, sdpOffer: sessionDescription});
                }, function(domerror){
                    console.log(domerror.name);
                }, { 'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true } });

            },
            answerPeer: function(peer, sdpAnswer){
                if (!peer){
                    $log.warn('Calling: no peer was given');
                }
                //we emit streams too just for order
                socket.emit('answer', {peer: peer.id, sdp: sdpAnswer, streams: this.localstreams});
            },

            createDataChannel: function (connection){

            },

            init: function (){
                if (this.initialized){
                    $log.warn('Room already initialized. No initialize needed');
                    return; //nothing to initialize
                }
                var self=this;
                this.getTurnServers();
                socket.on('userlist', function (data){
                    self.users=data;
                    $log.info('Updating user list');
                    if (self.onUserlist){
                        self.onUserlist(self.users);
                    }
                });

                socket.on('call', function(data){
                    $log.info('Incoming call. Data:');
                    $log.info(data);

                    var next=function(){
                        var connection = {
                            peer: self.findPeer(data.peer),
                            peerConnection: new RTCPeerConnection({iceServers: self.iceServers})
                        };
                        self.connections.push(connection);

                        //self.peer=self.findPeer(data.peer);
                        //self.peerConnection=new RTCPeerConnection({iceServers: self.iceServers});
                        connection.peerConnection.onicecandidate = function (event){
                            $log.info('ice candidate mined');
                            if (!connection.peerConnection || !event || !event.candidate) return;
                            var candidate = event.candidate;
                            //send to socket
                            socket.emit('iceCandidate',{to: self.findPeer(data.peer), candidate: event.candidate})
                        };

                        connection.peerConnection.onaddstream = function(event){
                            self.onStreamAdded(event);
                            event.stream.onremovestream=function(){
                                $log.info('removed stream');
                            };
                        };
                        connection.peerConnection.oniceconnectionstatechange=function(){
                            self.onConnectionStateChange(this);
                        };

                        //binding datachannels routine
                        connection.peerConnection.ondatachannel=function(event){
                            $log.warn('DataChannel initiated');

                            connection.dataChannel = event.channel;

                            connection.dataChannel.onopen = function (event){
                                self.onDataChannelStateChange && self.onDataChannelStateChange(connection.dataChannel)
                            };

                            connection.dataChannel.onclose = function (event){
                                self.onDataChannelStateChange && self.onDataChannelStateChange(connection.dataChannel)
                            };
                            connection.dataChannel.onmessage = function (event){
                                self.onDataChannelMessage && self.onDataChannelMessage(JSON.parse(event.data), connection);
                                $log.info('data channel message arrived');
                                $log.log(event.data);
                            };
                        };


                        for (var i=0;i<self.localstreams.length; i++){
                            connection.peerConnection.addStream(self.localstreams[i]);
                        }

                        connection.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdpOffer));
                        connection.peerConnection.createAnswer(function (sessionDescription) {
                            connection.peerConnection.setLocalDescription(sessionDescription);
                            //send sdp to caller
                            self.answerPeer(self.findPeer(data.peer), sessionDescription);
                        }, null, { 'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true } });
                    };
                    if (self.onCall){
                        self.onCall(data.peer, next);
                    }
                    else next();
                    $rootScope.$apply();
                });

                socket.on('iceCandidate', function(data){
                    $log.info('Remote ice candidate arrived');
                    //todo find connection by data.peer
                    var connection=self.findConnectionByPeer(data.peer);
                    if (!connection)
                        return;
                    connection.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                });

                socket.on('answer', function(data){
                    $log.info('Подключение одобрено', 'public');
                    $log.info(data);
                    var connection=self.findConnectionByPeer(data.peer);
                    if (!connection){
                        //nothing to do - no connection with such peer
                        return;
                    }
                    //saving stream order
                    self.remoteStreamOrder=[];
                    for (var i=0; i<data.streams.length;i++){
                        self.remoteStreamOrder.push(data.streams[i].id);
                    }
                    connection.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    self.onConnected();
                });

                socket.on('hangup', function (data){
                    var connection=self.findConnectionByPeer(data.peer);
                    $log.log('Hangup!');
                    if (!connection){
                        //strange, but nothing to do -exit
                        $log.warn('Hangup: no such peer connection!');
                        return;
                    }

                    connection.peerConnection.close();
                    var k=null;
                    for (var i=0; i<self.connections.length; i++){
                        if (self.connections[i]==connection){
                            k=i;
                        }
                    }
                    if (k!==null){
                        self.connections.splice(k,1);
                    }
                    $log.log('Hangup: peer conn closed and removed');
                    if (self.onCallEnd){
                        $log.log('Hangup: calling onCallEnd callback');
                        self.onCallEnd(connection.peer);
                    }
                });

                this.initialized=true;
            },
            getLocalStream: function (camId, micId, onSuccess, onError, streamIndex){
                var constraints={
                    'audio': (micId!==false && micId!==true) ? {optional: [{sourceId: micId}]} : micId,
                    'video': {
                        'mandatory': {
                            'minWidth': '100',
                            'maxWidth': '400',
                            'minHeight': '100',
                            'maxHeight': '300',
                            'minFrameRate': '10',
                            'maxFrameRate': '30'
                        },
                        'optional': camId ? [{sourceId: camId}] : []
                    }
                };

                var self=this;
                getUserMedia(constraints, function(stream){
                    //Корень зла
                    $log.log('Получили поток номер '+streamIndex);
                    if (streamIndex!==null && (typeof streamIndex !== 'undefined')){
                        self.localstreams[streamIndex]=stream;
                    }
                    else {
                        self.localstreams.push(stream);
                    }
                    onSuccess(stream);
                }, function(err){
                    $log.error('Error getting local stream! Reason: ');
                    $log.error(err);
                    if (onError){
                        onError(err);
                    }
                });
            },

            getTurnServers: function(){
                var self=this;
                var automat_url = window.robot_address.automat_url + '/turnservers';
                $http({method: 'GET', url:automat_url }).
                    success(function(data, status, headers, config) {
                        $log.info('successfully got turn servers');
                        for (var i = 0; i < data.uris.length; i++) {
                            // Create a turnUri using the polyfill (adapter.js).
                            var iceServer = createIceServer(data.uris[i],
                                data.username,
                                data.password);
                            if (iceServer !== null) {
                                self.iceServers.push(iceServer);
                            }
                        }
                    }).
                    error(function(data, status, headers, config) {
                        $log.error('Error occured: can not get turn servers');
                    });
            },

            /**
             * stops all local streams and empties local stream array
             */
            releaseLocalStreams: function(){
                for(var i=0;i<this.localstreams.length;i++){
                    this.localstreams[i] && this.localstreams[i].stop();
                }
                this.localstreams=[];
            },

            getVideoStats: function(peerConnection, callback){
                peerConnection.getStats(function(stats){
                    stats=stats.result();
                    var parsedStats={};
                    for (var i = 0; i < stats.length; ++i) {
                        var res = stats[i];
                        if (!res.local || res.local === res) {
                            // The bandwidth info for video is in a type ssrc stats record
                            // with googFrameHeightReceived defined.
                            // Should check for mediatype = video, but this is not
                            // implemented yet.
                            if (res.type == 'ssrc' && res.stat('googFrameHeightReceived')) {
                                // This is the video flow.
                                parsedStats={
                                    width: res.stat('googFrameWidthReceived'),
                                    height: res.stat('googFrameHeightReceived'),
                                    fps: res.stat('googFrameRateReceived'),
                                    delay: res.stat('googCurrentDelayMs')
                                }
                            }
                        }
                    }
                    callback(parsedStats);
                });
            }
        };
    });
