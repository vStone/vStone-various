#!/bin/bash
#

port="${1-22}"
host="${2-YOUR_HOSTNAME.example.com}"
user="${3-USERNAME}"
screen_name="${4-irssi}"

notify="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/notify-remote"

socat -u tcp4-listen:12000,reuseaddr,fork,bind=127.0.0.1 exec:$notify &
ssh $host -p $port -t -l $user -R 12000:127.0.0.1:12000 ${REMOTE} "screen -d -r -s ${screen_name}"
kill %1
