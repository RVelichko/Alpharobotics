/** Copyright &copy; 2016, Alfarobotics.
 * \brief  Набор утилит.
 * \author Величко Ростислав
 * \date   08.02.2016
 */

// Отображение и скрытие элемента
var UTILS = {};
UTILS.Display = function(element) {
    var _element = element;

    getRealDisplay = function(elem) {
        var computedStyle;
        if (elem.currentStyle) {
            return elem.currentStyle.display;
        } else if (window.getComputedStyle) {
            computedStyle = window.getComputedStyle(elem, null);
            return computedStyle.getPropertyValue('display');
        }
    };

    this.getDiv = function() {
        return _element;
    };

    this.hide = function() {
        _element.style.display = "none";
    };

    var _display_cache = {};

    this.show = function() {
        if (getRealDisplay(_element) !== 'none') {
            return;
        }

        var old = _element.getAttribute("displayOld");
        _element.style.display = old || "";

        if (getRealDisplay(_element) === "none") {
            var node_name = _element.nodeName;
            var body = document.body;
            var display = null;
            if (_display_cache[node_name]) {
                display = _display_cache[node_name];
            } else {
                var test_element = document.createElement(node_name);
                body.appendChild(test_element);
                display = getRealDisplay(test_element);
                if (display === "none") {
                    display = "block";
                }
                body.removeChild(test_element);
                _display_cache[node_name] = display;
            }
            _element.setAttribute('displayOld', display);
            _element.style.display = display;
        }
    };
};

// Загрузка конфигурационных файлов
UTILS.LoadJSON = function(file, callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', file, true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
};


// Получить первый элемент массива
UTILS.First = function(array) {
    for (var i in array) {
        return array[i];
    }
};
