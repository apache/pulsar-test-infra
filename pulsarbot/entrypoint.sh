#!/bin/bash
if [[ $TESTMODE == 1 ]]; then
    set -x
    cat ${GITHUB_EVENT_PATH}
fi
set -e

COMMENT_BODY=$(jq -r '.comment.body' "${GITHUB_EVENT_PATH}")
COMMENT_BODY=$(echo "$COMMENT_BODY" | xargs)

BOT_COMMAND_PREFIX="/pulsarbot"
BOT_TARGET_REPOSITORY=${GITHUB_REPOSITORY:-"apache/pulsar"}

if [[ ${COMMENT_BODY} != "${BOT_COMMAND_PREFIX}"* ]]; then
    echo "Not a pulsarbot command, skipping it ..."
    exit
fi

read -r -a commands <<< "${COMMENT_BODY}"
BOT_COMMAND=${commands[1]}
CHECK_NAME=""
if [ "${BOT_COMMAND}" == "rerun-failure-checks" ]; then
    CHECK_NAME="_all"
elif [ "${BOT_COMMAND}" == "run-failure-checks" ]; then
    CHECK_NAME="_all"
elif [ "${BOT_COMMAND}" == "run" ]; then
    CHECK_NAME=${commands[2]}
elif [ "${BOT_COMMAND}" == "rerun" ]; then
    CHECK_NAME=${commands[2]}
else
    echo "Invalid bot command '${BOT_COMMAND}', skip ..."
    exit
fi

if [[ "${CHECK_NAME}" == "" ]]; then
    echo "Invalid check name '${CHECK_NAME}', skip ..."
    exit
fi

PR_NUM=$(jq -r '.issue.number' "${GITHUB_EVENT_PATH}")

function github_get() {
    local urlpath="$1"
    github_client "https://api.github.com/repos/${BOT_TARGET_REPOSITORY}${urlpath}"
}

function github_client() {
    curl -s -H "Authorization: token ${GITHUB_TOKEN}" -H "Accept: application/vnd.github.v3+json" "$@"
}

# get head sha
PR_JSON="$(github_get "/pulls/${PR_NUM}")"
HEAD_SHA=$(printf "%s" "${PR_JSON}" | jq -r .head.sha)
PR_BRANCH=$(printf "%s" "${PR_JSON}" | jq -r .head.ref)
PR_USER=$(printf "%s" "${PR_JSON}" | jq -r .head.user.login)
PR_HTML_URL=$(printf "%s" "${PR_JSON}" | jq -r .html_url)

echo "Handling pulsarbot command for PR #${PR_NUM} ${PR_HTML_URL}"

function get_runs() {
    local page="${1:-1}"
    # API reference https://docs.github.com/en/rest/reference/actions#list-workflow-runs-for-a-repository
    github_get "/actions/runs?actor=${PR_USER}&branch=${PR_BRANCH}&page=${page}&per_page=100" \
    | jq -r --arg head_sha "${HEAD_SHA}" \
        '.workflow_runs[] | select(.head_sha==$head_sha) | [.workflow_id,.created_at,.conclusion // .status,.url,.name,.html_url] | @csv' \
        || true
}

# take the last attempt for each workflow to prevent restarting old runs
function filter_oldruns() {
    awk '
    BEGIN { FPAT="([^,]+)|(\"[^\"]+\")" }
    { 
        if (NR > 1 && LAST != null && LAST != $1) {
            print LASTLINE; print $0; LAST=null; LASTLINE=null
        } else {
            LAST = $1;LASTLINE = $0
        }
    } 
    END { if (LASTLINE != null) { print LASTLINE } }'
}

function get_all_runs() {
    local page=1
    local tempfile=$(mktemp)
    while true; do
        csv="$(get_runs $page | tee -a $tempfile)"
        if [ -z "$csv" ]; then
            break
        fi
        ((page++)) || true
    done
    if [ -f $tempfile ]; then
        if [ -s $tempfile ]; then
            cat $tempfile | sort
        fi
        rm $tempfile
    fi
}

# return url and name for failed or cancelled jobs that are the most recent ones for each workflow
function find_failed_or_cancelled() {
    get_all_runs | filter_oldruns \
      | awk '
      BEGIN { FPAT="([^,]+)|(\"[^\"]+\")" } 
      { 
        gsub(/"/, "", $3); gsub(/"/, "", $4); gsub(/"/, "", $5); gsub(/"/, "", $6); 
        if ($3 == "failure" || $3 == "cancelled") { print $4 "\t" $5 "\t" $6 }
      }'
}

# allocate file descriptor for the failed or cancelled url and name listing
exec {failures_fd}< <(find_failed_or_cancelled)

foundjobs=0

# handle failures
while IFS=$'\t' read -r url name html_url <&${failures_fd}; do
    if [[ "${CHECK_NAME}" == "_all" || "${name}" == *"${CHECK_NAME}"* ]]; then
        echo "rerun-failed-jobs for '${name}'. Follow progress at $html_url"
        # use https://docs.github.com/en/rest/reference/actions#re-run-failed-jobs-from-a-workflow-run
        # to rerun only the failed jobs
        github_client --fail-with-body -X POST "${url}/rerun-failed-jobs" || { echo "Failed."; }
        ((foundjobs++)) || true
    else
        echo "Expect ${CHECK_NAME}, skipping build job '${name}' ($html_url)"
    fi
done

if [[ $foundjobs == 0 ]]; then
    echo >&2 "Cannot find any failed workflow runs in PR #${PR_NUM}. Re-running can only target completed workflows."
else
    echo "Finished. Restarted $foundjobs job(s)."
fi
