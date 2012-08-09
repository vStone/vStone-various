#!/bin/bash
#

REMOTE="moose.irken.org"

socat -d -d -d -lf/tmp/socat.log -L/tmp/socat-irssi.lock -u \
  TCP-LISTEN:12000,reuseaddr,fork,bind=127.0.0.1,tcpwrap=script \
  EXEC:/home/jan/.local/bin/notify-remote 2>&1 >/dev/null &

Terminal -T irssi@moose --maximize -e "ssh -t -l jan -R 12000:127.0.0.1:12000 ${REMOTE} screen -d -r -s irssi"


## When not using terminal, uncomment the kill %1 to kill socat when closing your connection down. I keep it open until I shutdown :)
#kill %1
