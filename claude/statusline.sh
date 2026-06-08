#!/bin/bash
input=$(cat)

MODEL=$(echo "$input" | jq -r '.model.display_name')
DIR=$(echo "$input" | jq -r '.workspace.current_dir')
PROJECT_DIR=$(echo "$input" | jq -r '.workspace.project_dir // empty')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
COST=${COST:-0}
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
PCT=${PCT:-0}
HOUR_PCT=$(echo "$input" | jq -r '(.rate_limits["5h"] // .rate_limits.five_hour // .rate_limits.hour).used_percentage // empty')
WEEK_PCT=$(echo "$input" | jq -r '(.rate_limits["7d"] // .rate_limits.seven_day // .rate_limits.week).used_percentage // empty')
HOUR_RESET=$(echo "$input" | jq -r '(.rate_limits["5h"] // .rate_limits.five_hour // .rate_limits.hour).resets_at // empty')
DURATION_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')

RESET=$'\033[0m'
DIM=$'\033[2;37m'
WHITE=$'\033[0;37m'
BOLD_WHITE=$'\033[1;37m'
GREEN=$'\033[0;32m'
BOLD_GREEN=$'\033[1;32m'
CYAN=$'\033[0;36m'
YELLOW=$'\033[0;33m'
RED=$'\033[0;31m'
BOLD_RED=$'\033[1;31m'
MAGENTA=$'\033[0;35m'
BLUE=$'\033[0;34m'
BOLD_BLUE=$'\033[1;34m'

EURO_DOLLAR='0.85'
CONVERTED_COST=$( awk "BEGIN {printf \"%.2f\", $COST * $EURO_DOLLAR}")

COST_FMT=$(printf '~ €%.2f' "$CONVERTED_COST")

# Pick bar color based on context usage
if [ "$PCT" -ge 90 ]; then BAR_COLOR="$RED"
elif [ "$PCT" -ge 70 ]; then BAR_COLOR="$YELLOW"
else BAR_COLOR="$GREEN"; fi

if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null)
    STAGED=$(git diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
    MODIFIED=$(git diff --numstat 2>/dev/null | wc -l | tr -d ' ')

    GIT_STATUS=""
    [ "$STAGED" -gt 0 ] && GIT_STATUS="${GREEN}+${STAGED}${RESET}"
    [ "$MODIFIED" -gt 0 ] && GIT_STATUS="${GIT_STATUS}${YELLOW}~${MODIFIED}${RESET}"

    echo -e "${CYAN}[$MODEL]${RESET} ${DIR##*/} ${YELLOW}${COST_FMT}${RESET} > branch: $BRANCH $GIT_STATUS"
else
    echo "${CYAN}[$MODEL]${RESET} ${DIR##*/}"
fi

build_bar() {
  local pct=$1
  local filled=$(( pct * 8 / 100 ))
  local color
  if   [ "$pct" -ge 90 ]; then color="$BOLD_RED"
  elif [ "$pct" -ge 75 ]; then color="$RED"
  elif [ "$pct" -ge 50 ]; then color="$YELLOW"
  else                          color="$CYAN"
  fi
  local i=1 result=""
  while [ $i -le 8 ]; do
    if [ $i -le $filled ]; then result="${result}${color}▊${RESET}"
    else                        result="${result}${DIM}▊${RESET}"
    fi
    i=$(( i + 1 ))
  done
  printf '%s' "$result"
}

format_reset_time() {
  local epoch=$1
  local hhmm
  hhmm=$(date -r "$epoch" "+%l:%M %p" 2>/dev/null || date -d "@$epoch" "+%l:%M %p" 2>/dev/null)
  [ -z "$hhmm" ] && return 1
  hhmm="${hhmm# }"
  local hour=${hhmm%%:*}
  local rest=${hhmm#*:}
  local mins=${rest%% *}
  local ampm=${rest##* }
  ampm=$(printf '%s' "$ampm" | tr '[:upper:]' '[:lower:]')
  if [ "$mins" = "00" ]; then
    printf '%s%s' "$hour" "$ampm"
  else
    printf '%s:%s%s' "$hour" "$mins" "$ampm"
  fi
}

out="${BOLD_WHITE}Usage:${RESET}"

if [ -n "$PCT" ]; then
  pct=$(printf "%.0f" "$PCT")
  out="${out}  ${DIM}ctx${RESET} $(build_bar "$pct") ${WHITE}${pct}%${RESET}"
fi

if [ -n "$HOUR_PCT" ]; then
  pct=$(printf "%.0f" "$HOUR_PCT")
  out="${out}  ${DIM}5h${RESET} $(build_bar "$pct") ${WHITE}${pct}%${RESET}"
fi

if [ -n "$WEEK_PCT" ]; then
  pct=$(printf "%.0f" "$WEEK_PCT")
  out="${out}  ${DIM}7d${RESET} $(build_bar "$pct") ${WHITE}${pct}%${RESET}"
fi

if [ -n "$HOUR_RESET" ]; then
  reset_str=$(format_reset_time "$HOUR_RESET")
  if [ -n "$reset_str" ]; then
    out="${out}  ${DIM}reset${RESET} ${WHITE}${reset_str}${RESET}"
  fi
fi

printf '%s\n' "$out"


_issues_dir="${PROJECT_DIR:-$DIR}/issues"
# Issues and plans: scan issues/ folder in project root and display before bar
_print_issues_and_plans() {
  [ -d "$_issues_dir" ] || return 0
  local plans=() open_issues=()
  while IFS= read -r -d '' f; do
    plans+=("$(basename "$f" .md)")
  done < <(find "$_issues_dir" -maxdepth 1 -name 'plan-*.md' -print0 2>/dev/null | sort -z)
  while IFS= read -r -d '' f; do
    open_issues+=("$(basename "$f" .md)")
  done < <(find "$_issues_dir" -maxdepth 1 -name '[0-9]*.md' -print0 2>/dev/null | sort -z)
  if [ ${#plans[@]} -gt 0 ]; then
    printf "%b\n" "${MAGENTA}Plans:${RESET}"
    for item in "${plans[@]}"; do printf "  - %s\n" "$item"; done
  fi
  if [ ${#open_issues[@]} -gt 0 ]; then
    printf "%b\n" "${BLUE}Issues:${RESET}"
    local n=${#open_issues[@]}
    local rows=$(( (n + 1) / 2 ))
    local col_width=40
    for (( r = 0; r < rows; r++ )); do
      local left="${open_issues[$r]}"
      local right_idx=$(( r + rows ))
      if [ $right_idx -lt $n ]; then
        printf "  %-${col_width}s  - %s\n" "- $left" "${open_issues[$right_idx]}"
      else
        printf "  - %s\n" "$left"
      fi
    done
  fi
}
_print_issues_and_plans
