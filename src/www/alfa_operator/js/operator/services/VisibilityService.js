angular.module('collabAppServices').factory('VisibilityService', [
  '$rootScope',
  '$log',
  function ($rootScope, $log) {
    var hidden = null;
    var state = {
        isVisible: function () {
          return hidden === false;
        },
        isInvisible: function () {
          return hidden === true;
        },
        isUnknown: function () {
          return hidden === null;
        }
      };
    function isHidden() {
      var result = null;
      angular.forEach([
        'hidden',
        'webkitHidden',
        'msHidden'
      ], function (x) {
        if (document[x] !== undefined) {
          result = document[x];
        }
      });
      return result;
    }
    function handleVisibilityChange() {
      $rootScope.$apply(function () {
        hidden = isHidden();
      });
    }
    hidden = isHidden();
    document.addEventListener('visibilitychange', handleVisibilityChange, false);
    document.addEventListener('webkitvisibilitychange', handleVisibilityChange, false);
    document.addEventListener('msvisibilitychange', handleVisibilityChange, false);
    return state;
  }
]);