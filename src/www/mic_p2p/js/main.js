/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


document.onreadystatechange = function() {
    if (document.readyState === 'complete') {

        //var url = 'ws://localhost:20004/rest/';
        var url = 'ws://alfarobotix.ru:20004/rest/signaling/';
        var room_id = 'TEST_ROOM_ID';
        new OperatorMic({
            signaling_url: url + 'robot',
            room_id: room_id,
            name: "Operator Mic test"
        });
        new RobotMic({
            signaling_url: url + 'operator',
            room_id: room_id,
            name: "Robot mic test"
        });
        // setTimeout(function() {
        //     new RobotMic({
        //         signaling_url: url + 'operator',
        //         room_id: room_id,
        //         name: "Operator Developer"
        //     });
        // }, 10000);
    }
};
