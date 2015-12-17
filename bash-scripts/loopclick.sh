
## Sleeps X seconds-ish and prints a dot for each second.
##  Usage:   sleeping <options> <number_of_seconds>
##  Options:
##    -n       Add a newline after sleeping
sleeping() {
  local finish_newline="no"
  if [ "$1" == "-n" ]; then
    finish_newline="yes";
    shift;
  fi
  count=$1;
  if [ "$count"x == "x" ]; then
    syserr "You need to specify a number of seconds to wait for the sleeping function."
  fi;
  while [ $count -gt 0 ]; do
    echo -ne ".";
    sleep 1;
    let "count--";
  done;
  if [ "${finish_newline}" == "yes" ]; then
    echo "";
  fi;
}

echo "Sleep 3"
sleeping 3;

interval=${1-100}
between=${2-3}

while true; do
  i=0;
  echo -n "`date` Start cycle ($interval)..."
  while [ $i -lt $interval ]; do
    if [ `expr ${i} % 10` -eq 0 ]; then
      echo -n " ${i}"
    fi;
    let "i++"
    xdotool click 1
    sleep 0.07s
  done;
  echo ""
  echo "`date` cycle done, sleeping ${between}"
  sleeping ${between};
done;
