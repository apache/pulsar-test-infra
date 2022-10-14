#!/bin/bash

read -r -a TARGET_DIRS <<< "$*"

cat ${GITHUB_EVENT_PATH}
COMMITS=$(jq '.pull_request.commits' "${GITHUB_EVENT_PATH}")
echo "COMMITS: ${COMMITS}"

git --version
git rev-parse --abbrev-ref HEAD

if [[ $COMMITS -gt 0 ]]; then
    FIRST_COMMIT=$(git rev-parse HEAD~${COMMITS} 2> /dev/null)
    if [ $? -eq 0 ]; then
        CHANGED_DIRS=$(git diff --name-only $FIRST_COMMIT | awk -F "/*[^/]*/*$" '{ print ($1 == "" ? "." : $1); }' | sort | uniq)
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
            echo "changed_only=no" >> $GITHUB_OUTPUT
        else
            echo "Changes ${CHANGED_DIRS} only in $*, setting 'changed_only' to 'yes'"
            echo "changed_only=yes" >> $GITHUB_OUTPUT
        fi
    else
        echo "Cannot find first commit. Setting 'changed_only' to 'no'."
        echo "changed_only=no" >> $GITHUB_OUTPUT
    fi
else
    echo "Cannot find number of commits in pull_request. Setting 'changed_only' to 'no'."
    echo "changed_only=no" >> $GITHUB_OUTPUT

fi