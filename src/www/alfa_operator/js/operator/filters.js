angular.module('collabAppFilters', [])
    .filter('viewersonly', function() {
        return function(input) {
            var out = [];
            for (var i = 0; i < input.length; i++) {
                if (input[i].role=='viewer'){
                    out.push(input[i]);
                }
            }
            return out;
        }
    })
    .filter('reverse', function() {
        return function(input) {
            return input.slice().reverse();
        };
    });