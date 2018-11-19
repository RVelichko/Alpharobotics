#!/bin/sh

### BEGIN INIT INFO
# Provides:          AlfaRobotics
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: AlfaRobotics information operator services control
# Description:       This file starts and stops AlfaRobotics information operator servers
### END INIT INFO

# Для прописывания сервисов в автоматический старт после загрузки системы.
# update-rc.d alfa-operator-services defaults

find_proc() {
  if ps -e -o pgid,cmd | grep $1 | grep -v -q grep; then
    return 0
  else
    return 1
  fi
}

get_pid() {
  SYM=$(echo $1|cut -c 1)
  LINE=$(echo $1|cut -c 2-)
  echo $(ps ax|grep [$SYM]$LINE|sed 's/^[ ]*//'|cut -d " " -f1)
}

super_kill() {
  if find_proc $1; then
    PID=$(get_pid $1)
    echo "Принудительная остановка сервера $1: $PID"
    kill -9 $PID
  fi
}

kill_all() {
  super_kill "ws-json-saver-server"
  super_kill "ws-robot-server"
  super_kill "ws-file-uploader-server"
}

stop_service() {
  if find_proc $1; then
    PID=$(get_pid $1)
    echo "Остановка сервера $1: $PID"
    kill $PID

    # Ожидаем остановку сервиса
    COUNTER=10
    RES=1
    while : ; do
      sleep 1
      COUNTER=$((COUNTER-1))
      if find_proc $1; then
        RES=1
      else
        RES=0
        break
      fi
      if [ $COUNTER -eq 0 ]; then
        RES=1
        break
      fi
    done

    if [ $RES -eq 1 ]; then
      echo "Не получилось остановить сервис $1, останавливаем его принудительно"
      super_kill $1
      if [ find_proc $1 ]; then
        echo "Не получилось остановить сервис $1 даже принудительно!"
      else
        echo "OK"
      fi
    fi
  else
    echo "Cервер $1 не запущен."
  fi
}

start_service() {
  #echo "Запуск сервера $1 с конфигурацией $2.. "
  echo "Запуск сервера $1.. "
  #CONF=$2
  /alfarobotics/bin/$1 > /dev/null 2>&1 &
}

start() {
  cd /alfarobotics/www
  start_service "ws-json-saver-server"
  start_service "ws-robot-server"
  start_service "ws-file-uploader-server"
  cd -
}

stop() {
  stop_service "ws-json-saver-server"
  stop_service "ws-robot-server"
  stop_service "ws-file-uploader-server"
}

case "$1" in
 start)
   start
   ;;
 stop)
   stop
   ;;
 restart)
   stop
   start
   ;;
 *)
   echo "Usage: alfa-operator-services {start|stop|restart}" >&2
   exit 3
   ;;
esac
