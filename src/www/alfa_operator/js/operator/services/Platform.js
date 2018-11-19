angular.module('collabAppServices').service('Platform', [
    '$window',
    function ($window) {
        this.isNodeWebkit = !!$window.process;
        this.platform = this.isNodeWebkit ? $window.process.platform : 'web';
    }
]);