angular.module('collabAppDirectives', []).directive('requestnotifications', [
    'NotificationService',
    function (NotificationService) {
        return function (scope, element, attrs) {
            $(element).click(function () {
                NotificationService.request();
            });
        };
    }
]);