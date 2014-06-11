#!/bin/bash
#

_help() {
  cat - <<-EOHELP
USAGE: $0 [options] <pr#>

OPTIONS:

  -e, --edit        Edit the commit message before committing.
  -f, --force       Merge the pull request even if it has been closed.
                    This also does a force fetch to ensure the latest
                    upstream code locally.
  -n, --dry-run     Do everything but the actual merge.
  -r, --remote      The remote to use. Defaults to origin.
      --no-link     Do not include a link the project in the commit message.
      --full-link   Link using the complete github url.

  -v, --verbose     Be more verbose.
  -h, --help        You are looking at it.

EOHELP

}

syserr() { echo "ERROR: $@" 1>&2; exit 1; }
sysinfo() { echo "$@"; }
sysdebug() {
  [ -z "$DEBUG" ] && echo "DEBUG: $@";
}

## No options = show help
if [ -z $1 ]; then
  _help; exit 0;
fi;

#-------------------------------------------------------------------------------
#             _              _
#   __ _  ___| |_ ___  _ __ | |_ ___
#  / _` |/ _ \ __/ _ \| '_ \| __/ __|
# | (_| |  __/ || (_) | |_) | |_\__ \
#  \__, |\___|\__\___/| .__/ \__|___/
#  |___/

if `getopt -T >/dev/null 2>&1` ; [ $? = 4 ] ; then
  true; # Enhanced getopt.
else
 syserr "You are using an old getopt version $(getopt -V)";
fi;

GETOPT_TEMP=`getopt -o -efhnvr: \
  --long dry-run,edit,force,help,verbose,remote:,no-link,full-link \
  -n "$0" -- "$@"`;
if [[ $? != 0 ]]; then
  syserr "Error parsing arguments."
fi;

while [ $# -gt 0 ]; do
  case "$1" in
    -e|--edit)      edit="1";;
    -f|--force)     force="1";;
    -r|--remote)    remote=$2; shift;;
    -v|--verbose)   verbose="1";;
    -n|--dry-run)   dry_run="1";;
       --no-link)   no_link="1";;
       --full-link) full_link="1";;

    -h|--help)      _help; exit 0;;
    -*)             syserr "Unknown option '$1'";;
    --)             shift; break;;
    *)              break;;
  esac;
  shift;
done;

pr=$1;
remote="${remote-origin}";

[ "$no_link" == "1" ] && [ "$full_link" == "1" ] && syserr "Choose: --no-links OR --full-links. Not both!"

if ! echo $pr | grep -q '^[0-9]\+$'; then
  syserr "Pull request number  must be numeric"
fi;

if ! git remote | grep -q "^${remote}\$"; then
  syserr "The remote '${remote}' is not known to git.";
fi

url=$( git remote show -n $remote | grep 'Push' | sed 's@.*URL\:\s\+\(.*\)$@\1@' );
project=$( echo $url | sed 's@.*\(/\|:\)\([^/]\+\)/\([^/]\+\).git$@\2/\3@' )

if [ "${full_link}" == "1" ]; then
  pr_link="https://github.com/${project}/pull/${pr}"
else
  pr_link="${project}#${pr}"
fi;

sysinfo "Project: $project";
sysinfo " + URL: https://github.com/${url}";

tmpfile=$( mktemp --tmpdir "$( basename $0 )-XXXXXX" );
sysdebug "Fetching pull request information: 'https://api.github.com/repos/${project}/issues/${pr}'";
sysdebug "Storing information in '$tmpfile'";

curl -# -s -H 'Accept: application/vnd.github.v3+json' -i https://api.github.com/repos/${project}/issues/${pr}  > $tmpfile || syserr "Could not fetch metadata for pr ${pr}"

state="$( grep '"state":' $tmpfile | sed 's@.*"state": "\(.*\)",$@\1@' )";
title="$( grep '"title":' $tmpfile | sed 's@.*"title": "\(.*\)",$@\1@' )";

if [[ "${state}" == "closed" && "${force}" != "1" ]]; then
  syserr "This pull request is marked as closed on the remote (http://github.com/${project}/pull/${pr}). Use -f to force.";
fi;

sysinfo "Pull Request #${pr}: $title ($state)";
sysdebug "Fetching remote ref: 'git fetch ${remote} pull/${pr}/head:pr/${pr}'"

git_fetch_opts=""

if [ "$force" == "1" ]; then
  git_fetch_opts="--force"
fi;

if [ "$verbose" == "1" ]; then
  git fetch -v $git_fetch_opts ${remote} pull/${pr}/head:pr/${pr} || syserr "Could not get remote pull request";
else
  git fetch -q $git_fetch_opts ${remote} pull/${pr}/head:pr/${pr} 2>/dev/null || syserr "Could not get remote pull request";
fi;


_git_merge_cmd="git merge --no-ff pr/${pr} --log";
[ "$edit" == "1" ] &&  _git_merge_cmd+=" -e";
[ "$verbose" == "1" ] && _git_merge_cmd+=" --verbose";

if [ "$dry_run"  == "1" ]; then
  sysinfo "$_git_merge_cmd -m <MESSAGE>";
else
  if [ "${no_link}" == "1" ]; then
    $_git_merge_cmd -m "Merged pull request: #${pr}: ${title}" || syserr "Unable to merge branch pr/${pr}"
  else

    $_git_merge_cmd -m "Merged pull request: ${pr_link}: ${title}

See ${pr_link} for more information" || syserr "Unable to merge branch pr/${pr}";
  fi;
fi;

rm $tmpfile;
