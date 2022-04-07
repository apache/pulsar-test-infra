#!/bin/bash

set -e

cat ${GITHUB_EVENT_PATH}
COMMENT_BODY=$(jq -r '.comment.body' "${GITHUB_EVENT_PATH}")

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
    path="$1"
    github_client "https://api.github.com/repos/${BOT_TARGET_REPOSITORY}${path}"
}

function github_client() {
    curl -s -H "Authorization: token ${GITHUB_TOKEN}" -H "Accept: application/vnd.github.v3+json" "$@"
}

# get head sha
PR_JSON="$(github_get "/pulls/${PR_NUM}")"
HEAD_SHA=$(printf "%s" "${PR_JSON}" | jq -r .head.sha)

function get_failed_checks() {
    github_get "/commits/${HEAD_SHA}/check-runs?per_page=100" | jq -r '.check_runs[] | select(.status == "completed" and (.conclusion == "failure" or .conclusion == "cancelled")) | @base64'
}

# find the failures 
FAILED_CHECKS=$(get_failed_checks)
for row in $FAILED_CHECKS; do
    _jq() {
        echo "${row}" | base64 --decode | jq -r ${1}
    }

    name=$(_jq '.name')
    id=$(_jq '.id')
    details_url=$(_jq '.details_url')

    if [[ "${CHECK_NAME}" == "_all" || "${name}" == *"${CHECK_NAME}"* ]]; then
        echo "rerun-failed-jobs for '${name}' ($details_url)"
        # use https://docs.github.com/en/rest/reference/actions#re-run-failed-jobs-from-a-workflow-run
        # to rerun only the failed jobs
        github_client -X POST "https://api.github.com/repos/${BOT_TARGET_REPOSITORY}/actions/runs/${id}/rerun-failed-jobs"
    else
        echo "Expect ${CHECK_NAME}, skipping build job '${name}' ($details_url)"
    fi
done
