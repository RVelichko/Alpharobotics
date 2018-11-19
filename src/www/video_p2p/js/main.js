/** Copyright &copy; 2016, Alfarobotics.
 * \author Rostislav Velichko
 * \email  rostislav.vel@gmail.com
 */


document.onreadystatechange = function() {
    if (document.readyState === 'complete') {

        var url = 'ws://localhost:20004/rest/signaling/';
        //var url = 'ws://185.58.205.67:20004/rest/';
        var room_id = 'TEST_ROOM_ID';
        new RobotAutomat({
            signaling_url: url + 'robot',
            room_id: room_id,
            name: "Robot Developer"
        });
        setTimeout(function() {
            new OperatorAutomat({
                signaling_url: url + 'operator',
                room_id: room_id,
                name: "Operator Developer"
            });
        }, 1000);
        setTimeout(function() {
            new OperatorAutomat({
                signaling_url: url + 'operator',
                room_id: room_id,
                name: "Operator Developer"
            });
        }, 10000);
    }
};
