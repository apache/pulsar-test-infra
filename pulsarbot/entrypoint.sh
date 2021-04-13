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

# get head sha
curl -s -H "Accept: application/vnd.github.antiope-preview+json" "https://api.github.com/repos/${BOT_TARGET_REPOSITORY}/git/ref/pull/${PR_NUM}/head" > result-headsha.txt
HEAD_SHA=$(jq -r '.object.sha' result-headsha.txt)

# get checkrun results
curl -s -H "Accept: application/vnd.github.antiope-preview+json" "https://api.github.com/repos/${BOT_TARGET_REPOSITORY}/commits/${HEAD_SHA}/check-runs?per_page=100" > result-check-runs.txt

# find the failures 
for row in $(cat result-check-runs.txt | jq -r '.check_runs[] | select(.status == "completed" and (.conclusion == "failure" or .conclusion == "cancelled")) | @base64'); do
    _jq() {
        echo ${row} | base64 --decode | jq -r ${1}
    }

    name=$(echo $(_jq '.name'))
    check_suite_id=$(echo $(_jq '.check_suite.id'))
    if [[ "${CHECK_NAME}" == "_all" || "${CHECK_NAME}" == "${name}" ]]; then
        echo "rerun action ${name}, check_suite_id = ${check_suite_id}"
        curl -H "Authorization: token ${GITHUB_TOKEN}" -H "Accept: application/vnd.github.antiope-preview+json" -X POST "https://api.github.com/repos/${BOT_TARGET_REPOSITORY}/check-suites/${check_suite_id}/rerequest"
    else
        echo "Expect ${CHECK_NAME} but skip action ${name}, check_suite_id = ${check_suite_id}"
    fi
done
