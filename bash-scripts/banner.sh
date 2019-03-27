#!/bin/bash

set -o errexit # exit on any command failure; use `whatever || true` to accept failures
set -o pipefail # pipes fail when any command fails, not just the last one (see above for workaround)
set -o nounset # exit on use of undeclared var, use `${possibly_undefined-}` to substitute the empty string in that case
#set -o xtrace

declare -a fonts=(
  thin
  ivrit
  bigfig
  drpepper
  mini
  small
)

declare -a on_exit_items
on_exit() {
    for i in "${on_exit_items[@]}"; do
        eval $i
    done
}
add_on_exit() {
    local n=${#on_exit_items[*]}
    on_exit_items[$n]="$*"
    if [[ $n -eq 0 ]]; then
        trap on_exit EXIT
    fi
}

_help() {
  cat - <<EOHELP
USAGE:
  $0 <options> [arguments]

OPTIONS:
    -a, --all               Show all pre-configured fonts.
    -f, --font=<font>       Set the toilet font.
    -o, --output=<output>   What output filter to pass text through.
                            Possible values are: 'console', 'comment',
                            ruby, bash
    -l, --line              Print a header line.
    -h, --help              This help message.

ARGUMENTS:
  Text

EOHELP
}

## Helper function to output stuff to stderr and exit with a non-zero status.
syserr() {
  echo $* 1>&2
  exit 1;
}

## show help if no arguments are given
[ $# -eq 0 ] && _help && exit 0;

## getopt parsing
if `getopt -T >/dev/null 2>&1` ; [ $? = 4 ] ; then
  true; # Enhanced getopt.
else
  syserr "You are using an old getopt version $(getopt -V)";
fi;

if GETOPT_TEMP="$( getopt --shell bash --name $0 \
  -o af:o:lh --long all,font:,output:,line,help -- "$@" )"; then
    eval set -- "${GETOPT_TEMP}"
else
    _help
    exit 64
fi

PRINT_LINE=0;
OUTPUT="${OUTPUT-console}"

while [ $# -gt 0 ]; do
  case "$1" in
    -a|--all)     FONT="_all_";;
    -f|--font)    FONT="${FONT-$2}"; shift;;
    -o|--output)  OUTPUT=$2; shift;;
    -h|--help)    _help; exit 0;;
    -l|--line)    PRINT_LINE=1;;
    --)           shift; break;;
    *)            break;;
  esac;
  shift;
done;


function output_line() {
  line=` echo -n ""; for i in {1..79}; do echo -n '-'; done; echo -ne "\n" `
  echo "$line";
}

function output_toilet() {
  [ $# -gt 0 ] && local font="$1";
  echo "$( echo "$( toilet -t -f "${font}" "${TEXT}" | sed -e 's@^[ ]*$@@g' | tac )" | tac)"
}

output_filter() {
  case "${OUTPUT}" in
    console)  cat;;
    comment)  cat | sed -e "s@^@# @" -e 's@\s*$@@';;
    ruby)     cat | sed -e "s@\(\\\\\)@\\\\\1@g" -e "s@'@\\\'@g" -e "s/^\(.*\)$/    puts '\1'/";;
    bash)     cat | sed -e 's@`@\\`@g' -e 's@\\$@\\\\@';;
    javacomment) echo "/*"; cat; echo "*/";
  esac
}

output() {
  local font=$1;
  if [ $PRINT_LINE -eq 1 ]; then
    output_line | output_filter;
  fi;
  output_toilet | output_filter
}

TEXT="$@"
FONT="${FONT-0}"

if [ "${FONT}" == "_all_" ]; then
  for i in "${fonts[@]}"; do
    echo "FONT: $i"
    output $i
  done;
elif grep -q '[0-9]\+' <<<"${FONT}"; then
  output "${fonts[$FONT]}"
else
  output "${FONT}"
fi

