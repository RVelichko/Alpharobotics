#! /bin/sh

### BEGIN INIT INFO
# Provides: forever node
# Required-Start: $remote_fs $syslog
# Required-Stop: $remote_fs $syslog
# Default-Start: 2 3 4 5
# Default-Stop: 0 1 6
# Short-Description: Node.js App Init Script
# Description: This file should be used to construct scripts to be
# placed in /etc/init.d.
### END INIT INFO

# Author: Velichko Rostislav

# Do NOT "set -e"

export PATH=$PATH:/usr/local/bin
export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules

case "$1" in
start)
exec forever -a -l /alfarobotics/log/forever_log.log -o /alfarobotics/log/video_service_output.log -e /alfarobotics/log/video_service_errors.log --sourceDir=/alfarobotics/video_service/ -p /alfarobotics/video_service/pidfile start app.js
;;
stop)
exec forever stop 0
;;
*)
echo "Usage: /etc/init.d/video-service.sh {start|stop}"
exit 1
;;
esac

exit 0
