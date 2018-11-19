angular.module('collabAppServices').factory('WebNotificationService', [
  '$rootScope',
  '$timeout',
  '$window',
  '$log',
  'VisibilityService',
  function ($rootScope, $timeout, $window, $log, VisibilityService) {
    var state = {
        supported: false,
        requested: false,
        granted: false,
        request: function () {
          state.requested = true;

          function gotPermission() {
              $log.info('ok. notifications granted');
              state.granted=true;
              $rootScope.notifyGranted=state.granted;
              $rootScope.$apply();
          }
          if (window.webkitNotifications) {
            window.webkitNotifications.requestPermission(gotPermission);
          } else if (window.Notification) {
            window.Notification.requestPermission(gotPermission);
          }
        },
        notify: function (title, content, icon, timeout) {
          if (!state.supported) {
            return;
          }
          var n, _timeout;
          var onclick = function () {
            $window.focus();
            this.close();
          };
          var onclose = function () {
            if (_timeout) {
              $timeout.cancel(_timeout);
            }
          };
          if (window.webkitNotifications) {
            n = window.webkitNotifications.createNotification(icon, title, content);
            n.onclick = onclick;
            n.onclose = onclose;
            n.show();
          } else if (window.Notification) {
            n = new window.Notification(title, {
              iconUrl: icon,
              body: content,
              onclick: onclick,
              onclose: onclose
            });
          } else {
            return;
          }
          _timeout = $timeout(function () {
            _timeout = null;
            n.close();
          }, timeout || 5000);
        },
        notify_if_invisible: function (title, content, icon, timeout) {
          if (!VisibilityService.isVisible()) {
            state.notify(title, content, icon, timeout);
          }
        }
      };
    if (window.webkitNotifications) {
      state.supported = true;
      state.granted = window.webkitNotifications.checkPermission() === 0;
    } else if (window.Notification) {
      state.supported = true;
      state.granted = window.Notification.permission === 'granted';
    } else {
      state.supported = false;
    }
    return state;
  }
]);
angular.module('collabAppServices').factory('LinuxNotificationService', [
  '$rootScope',
  '$timeout',
  '$window',
  '$log',
  'VisibilityService',
  function ($rootScope, $timeout, $window, $log, VisibilityService) {
    var state = {
        supported: true,
        requested: true,
        granted: true,
        request: function () {
          $rootScope.$broadcast('html5_notification_granted');
        },
        notify: function (title, content, icon, timeout) {
          var exec = require('child_process').exec;
          exec('notify-send -t ' + (timeout || 5000) + ' -i remotest -a Remote.st "' + title + '" "' + content + '"', function (error, stdout, stderr) {
            console.log(error);
          });
        },
        notify_if_invisible: function (title, content, icon, timeout) {
          state.notify(title, content, icon, timeout);
        }
      };
    return state;
  }
]);
angular.module('collabAppServices').factory('NotificationService', [
  '$window',
  '$injector',
  'Platform',
  function ($window, $injector, Platform) {
    var platform_name = Platform.platform;
    switch (platform_name) {
    case 'linux':
      return $injector.get('LinuxNotificationService');
      break;
    }
    return $injector.get('WebNotificationService');
  }
]);