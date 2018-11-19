KeyPad = function(enter_func, sendCmd) {
    setInterval(function () {
        executeCommand();
    }, 300);

    var keys = [0, 0, 0, 0];

    document.getElementById("up").onmousedown = function () {
        keys = [0, 1, 0, 0];
    };

    document.getElementById("leftUp").onmousedown = function () {
        keys = [1, 1, 0, 0];
    };

    document.getElementById("rightUp").onmousedown = function () {
        keys = [0, 1, 1, 0];
    };

    document.getElementById("left").onmousedown = function () {
        keys = [1, 0, 0, 0];
    };

    document.getElementById("right").onmousedown = function () {
        keys = [0, 0, 1, 0];
    };

    document.getElementById("leftDown").onmousedown = function () {
        keys = [1, 0, 0, 1];
    };

    document.getElementById("rightDown").onmousedown = function () {
        keys = [0, 0, 1, 1];
    };

    document.getElementById("down").onmousedown = function () {
        keys = [0, 0, 0, 1];
    };

    document.onmouseup = function () {
        keys = [0, 0, 0, 0];
    };

    document.onkeydown = function (e) {
        var use = false;
        e = e || window.event;
        var kc = e.keyCode;
        if (kc === 37) {
            keys[0] = 1;
            use = true;
        } else if (kc === 38) {
            keys[1] = 1;
            e.preventDefault();
            use = true;
        } else if (kc === 39) {
            keys[2] = 1;
            use = true;
        } else if (kc === 40) {
            keys[3] = 1;
            e.preventDefault();
            use = true;
        }
        if (kc === 13) {
            enter_func();
        }
    };

    document.onkeyup = function (e) {
        var use = false;
        e = e || window.event;
        var kc = e.keyCode;
        if (kc === 37) {
            keys[0] = 0;
            use = true;
        } else if (kc === 38) {
            keys[1] = 0;
            use = true;
        } else if (kc === 39) {
            keys[2] = 0;
            use = true;
        } else if (kc === 40) {
            keys[3] = 0;
            use = true;
        }
    };

    var centre_interval;
    function executeCommand() {
        if (keys[0] === 1 && keys[1] !== 1 && keys[3] !== 1) {
            sendCmd('left');
        }
        if (keys[1] === 1 && keys[0] !== 1 && keys[2] !== 1) {
            sendCmd('up');
        }
        if (keys[2] === 1 && keys[1] !== 1 && keys[3] !== 1) {
            sendCmd('right');
        }
        if (keys[3] === 1 && keys[0] !== 1 && keys[2] !== 1) {
            sendCmd('down');
        }
        if (keys[0] === 1 && keys[1] === 1) {
            sendCmd('leftUp');
        }
        if (keys[0] === 1 && keys[3] === 1) {
            sendCmd('leftDown');
        }
        if (keys[2] === 1 && keys[1] === 1) {
            sendCmd('rightUp');
        }
        if (keys[2] === 1 && keys[3] === 1) {
            sendCmd('rightDown');
        }
        if (!keys[0] && !keys[1] && !keys[2] && !keys[3]) {
            if (!centre_interval) {
                sendCmd('centre');
                centre_interval = setInterval(function () {
                    sendCmd('centre');
                }, 1000);
            }
        } else if (centre_interval) {
            clearInterval(centre_interval);
            centre_interval = undefined;
        }
    }
};
