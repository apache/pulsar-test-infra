#!/bin/bash

read -r -a TARGET_DIRS <<< "$*"

cat ${GITHUB_EVENT_PATH}
COMMITS=$(jq '.pull_request.commits' "${GITHUB_EVENT_PATH}")
echo "COMMITS: ${COMMITS}"

git --version
git rev-parse --abbrev-ref HEAD

CHANGED_DIRS=$(git diff --dirstat=files,0 HEAD~${COMMITS} | awk '{ print $2 }')
echo "CHANGED_DIRS are : ${CHANGED_DIRS}"

found_changed_dir_not_in_target_dirs="no"
for changed_dir in ${CHANGED_DIRS}
do
    matched="no"
    for target_dir in "${TARGET_DIRS[@]}"
    do
        if [[ ${changed_dir} == "${target_dir}"* ]]; then
            matched="yes"
            break
        fi
    done
    if [[ ${matched} == "no" ]]; then
        found_changed_dir_not_in_target_dirs="yes"
        break
    fi
done

if [[ ${found_changed_dir_not_in_target_dirs} == "yes" ]]; then
    echo "Changes ${CHANGED_DIRS} not only in $*, setting 'changed_only' to 'no'"
    echo ::set-output name=changed_only::no
else
    echo "Changes ${CHANGED_DIRS} only in $*, setting 'changed_only' to 'yes'"
    echo ::set-output name=changed_only::yes
fi