'use strict';

/* Controllers */
angular.module('collabApp', ['collabAppServices', 'collabAppFilters', 'collabAppDirectives'])
    .config(function($provide) {
        $.ajaxSetup({async: false});
        $.getJSON('robot_address.json')
            .done(function(json) {
                window.robot_address = json;
                window.role='operator';
                window.commandDelayInterval=200;
                window.buttonPressDelay=500;
                window.settingsPassword='password';
                window.operator_id = 'operator_id';
            })
            .fail(function(jqxhr, textStatus, error) {
                console.log('Can`t load "robot_address.json": ' + textStatus + ", " + error);
            });
        $.ajaxSetup({async: true});

        $provide.decorator('$log', function($delegate, $sniffer) {
            var _log = $delegate.info; //Saving the original behavior
            $delegate.info = function(msg){ //replacing the original behavior and including the original
                _log(msg);
            };
            return $delegate;
        });
    })
    .directive('enterpress', function() {
        return function(scope, element, attrs) {
            element.bind("keydown keypress", function(event) {
                if(event.which === 13) {
                    scope.$apply(function(){
                        scope.$eval(attrs.enterpress, {'event': event});
                    });
                    event.preventDefault();
                }
            });
        };
    })
    .run(function ($rootScope, $log){
        $rootScope.logMessages=[];
        var _log=$log.info;
        $log.info=function(msg){
            if (typeof msg=='string'){
                var t=new Date(),
                    ms='00'+t.getMilliseconds();
                msg = t.toLocaleTimeString()+':'+ms.substr(ms.length-3)+' - '+msg;
            }
            if (arguments[1] && arguments[1]=='public'){
                $rootScope.logMessages.push({text: msg});
            }
            _log(msg);
        }
    })
    .controller('OperatorCtrl', function($scope, $rootScope, socket, Room, $log, $timeout, $interval, NotificationService) {
        $scope.clientBusy=false;
        $scope.chatMsgText='';
        $scope.chatMessages=[];
        $scope.snapshots=[];
        $scope.videoStats={};

        $scope.commandsLastTime={};
        var sendingCommandsList=[],
            sendingCommandsTimer=null,
            sendingCommandsTimeout=null;


        $scope.remoteMediaSources=null;
        $scope.usedRemoteMediaSettings={
            cams: [],
            mics: [null, false]
        };

        $scope.releaseTimerCommands=function(){
            if (sendingCommandsTimer){
                $interval.cancel(sendingCommandsTimer);
                sendingCommandsTimer=null;
            }
            sendingCommandsList=[];
        };

        angular.element('#remoteVideo').bind('play', function (e) {
            $scope.inTalk=true;
            $scope.calling=false;
            $log.info('Видео стартовало', 'public');
            $interval(function (){
                if (!Room.connections[0] || !Room.connections[0].peerConnection){
                    return;
                }
                Room.getVideoStats(Room.connections[0].peerConnection, function(stats){
                    //ready stats go here
                    $scope.videoStats=stats;
                    $scope.$apply();
                });
            }, 1000);
        });

        $('#volumeSlider').slider().on('slide', function(ev){
            //todo проверить, вообще подключен ли я к роботу
            try{
                Room.connections[0].dataChannel.send(JSON.stringify({
                    type: 'change_volume',
                    volume: ev.value
                }));
                $log.info('Отправлена команда: '+ cmd, 'public');
            }
            catch (e){
                $log.error('Ошибка отправки сообщения в канал данных');
            }
        });

        $("#enter-pass").modal({
            keyboard: false,
            show: false
        });

        $scope.showSettingsModal=function(pass){
            if (pass!=window.settingsPassword){
                $scope.settingsPassIsWrong=true;
                return;
            }
            $('#enter-pass').modal('hide');
            $("#settingsModal").modal({
                keyboard: false
            });
            //запросим камеры/микрофоны с робота
            var peer=Room.findPeerByRole('automat');
            if (peer){
                socket.emit('listMediaSources',peer.id);
            }

            $("#settingsModal").modal({
                keyboard: false
            });
        }

        $scope.saveCams=function(){
            var peer=Room.findPeerByRole('automat');
            if (peer){
                socket.emit('setupMediaSources', {socketId: peer.id, data: $scope.usedRemoteMediaSettings});
            }
        }

        $rootScope.$watch('notifyGranted', function(){
            if ($rootScope.notifyGranted){
                $("#notifyModal").modal('hide');
            }
        });

        $scope.displayAutomatVideo = function (){
            socket.emit('hideOwnVideo', $scope.hideAutomatVideo);
        };

        /**
         * Refresh the remote page on automat
         */
        $scope.refreshAutomat=function(){
            $log.info('Обновляем автомат','public');
            socket.emit('refreshAutomatPage');
            $log.info('Обновление страницы через 3 сек','public');
            $timeout(function (){
                location.reload();
            },3000);
            $log.info('Обновляем автомат','public');

            var connect = {
                room_id: window_config.room_id,
                cmd: 'refresh'
            };
            window.websock.send(JSON.stringify(connect));
        };

        socket.on('snapshot', function (data){
            $scope.snapshots[data.camId]=data.data;
        });

        socket.on('automatBusy', function(){
            $log.warn('Клиент говорит с другим оператором');
            $scope.clientBusy=true;
            $timeout(function(){
                $scope.clientBusy=false;
            }, 5000, false);
            $scope.endCall();
        });

        $scope.callClient=function(){
            $scope.incomingCall=false;
            var peer=Room.findPeerByRole('automat');
            if (!peer){
                $log.info('Автомат не в онлайне!','public');
                console.log('Автомат не в онлайне!');
            }
            else {
                console.log('Call peer for Room!');
                $scope.calling=true;
                Room.callPeer(peer, function(){});
            }
        };

        $scope.declineCall=function (){
            $scope.incomingCall=false;
            socket.emit('declineCall');
        };

        Room.onUserlist=function(users){
            var automatOnline=false;
            for (var i in users){
                automatOnline=(users[i].role=='automat') || automatOnline;
            }
            $log.info('Автомат '+(automatOnline ? 'онлайн!': 'оффлайн!'),'public');
        };

        Room.onDataChannelStateChange=function(channel){
            if (channel.readyState=='open'){
                $log.info('Канал данных открыт','public');
            }
            else {
                $log.info('Канал данных закрыт', 'public');
            }
        };

        $scope.endCall=function(){
            $scope.inTalk=false;
            $scope.calling=false;
            if (!Room.connections[0]){
                return; //nothing to do - no conections
            }
            socket.emit('hangup', Room.connections[0].peer.id);
            Room.connections[0].peerConnection.close();
            Room.connections.splice(0,1);
        };

        socket.on('connect', function () {
            Room.join(window.robot_address.room_id, window.role);
        });

        socket.on('mediaSources', function (sources) {
            $log.log('Media sources arrived!');
            $log.log(sources);
            $scope.remoteMediaSources=sources;
        });

        Room.onCallEnd=function(peer){
            $scope.inTalk=false;
            $scope.$apply();
        }
    })
;