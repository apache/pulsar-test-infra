#!/bin/bash

cat ${GITHUB_EVENT_PATH}

GITHUB_TOKEN=${GITHUB_TOKEN:-""}

configure_args() {
    readonly GITHUB_USER=${1}
    readonly GITHUB_EMAIL=${2}
    readonly GITHUB_REPOS=${3}
}

# Get the PR merged sha and the title
cherrypick_args() {
    readonly COMMENT_BODY=$(jq -r '.comment.body' ${GITHUB_EVENT_PATH})
    readonly PR_NUMBER=$(jq -r '.issue.number' "$GITHUB_EVENT_PATH")

    readonly BOT_BRANCH_NAME="pulsarbot/cherry-pick-${PR_NUMBER}"
    readonly BOT_PR_TITLE_PREFIX="[bot-cherry-pick]"
    if [[ "" == "${GITHUB_TOKEN}" ]]; then
       readonly PR_INFO=$(curl -s --request GET \
            --url https://api.github.com/repos/${GITHUB_REPOS}/pulls/${PR_NUMBER} \
            --header 'Accept: application/vnd.github.sailor-v-preview+json')
    else
        readonly PR_INFO=$(curl -s --request GET \
            --url https://api.github.com/repos/${GITHUB_REPOS}/pulls/${PR_NUMBER} \
            --header "Authorization: token ${GITHUB_TOKEN}" \
            --header 'Accept: application/vnd.github.sailor-v-preview+json')
    fi

    readonly PR_MERGE_COMMIT_SHA=`echo ${PR_INFO} | jq -r .merge_commit_sha`
    readonly PR_TITLE=`echo ${PR_INFO} | jq -r .title`
}

# setup github for commit the changes
git_setup() {
   git config user.name "${GITHUB_USER}"
   git config user.email "${GITHUB_EMAIL}"
}

check_pr_is_merged() {
    MERGED=`echo ${PR_INFO} | jq -r .merged`
    if [[ "false" == ${MERGED} ]]; then
        echo "PR is not merged"
        exit 0
    fi
}

cherrypick() {
    check_pr_is_merged
    TARGET_BRANCH=`echo ${COMMENT_BODY} | grep -o "branch-[0-9].[0-9]"`
    if [[ "" == ${TARGET_BRANCH} ]]; then
        echo "Wrong target branch"
        exit 1
    fi
    git fetch --all
    git checkout ${TARGET_BRANCH}
    git checkout -b ${BOT_BRANCH_NAME}
    git status
    git cherry-pick -x "${PR_MERGE_COMMIT_SHA}" -X Recursive
    status=$?
    if [[ ${status} != 0 ]]; then
        git add .
        git commit --allow-empty -m "${BOT_PR_TITLE_PREFIX}${PR_TITLE}"
    fi
    git push origin ${BOT_BRANCH_NAME}
    gh pr create --title "${BOT_PR_TITLE_PREFIX}${PR_TITLE}" --fill --base ${TARGET_BRANCH}
}

pr_close_prompt_args() {
    readonly PR_NUMBER=$(jq -r '.number' "${GITHUB_EVENT_PATH}")
    if [[ "" == "${GITHUB_TOKEN}" ]]; then
        readonly PR_INFO=$(curl -s --request GET \
            --url https://api.github.com/repos/${GITHUB_REPOS}/pulls/${PR_NUMBER} \
            --header 'Accept: application/vnd.github.sailor-v-preview+json')
    else
       readonly PR_INFO=$(curl -s --request GET \
            --url https://api.github.com/repos/${GITHUB_REPOS}/pulls/${PR_NUMBER} \
            --header "Authorization: token ${GITHUB_TOKEN}" \
            --header 'Accept: application/vnd.github.sailor-v-preview+json')
    fi
}

pr_close_prompt() {
    check_pr_is_merged
    COMMENTS_URL=`echo ${PR_INFO} | jq -r ._links.comments.href`
    REVIEWS=`echo ${PR_INFO} | jq '.requested_reviewers[] | .login'`
    users=""
    for review in ${REVIEWS}; do
        users="${users}, @${review}"
    done
    if [[ "" == ${users} ]]; then
        PROMPT_SENTENCE="Hey. If you want to cherry-pick this pr to a target branch, please comments '/pulsarbot cherry-pick to branch-x.y'."
    else
        PROMPT_SENTENCE="Hey, ${users}. If you want to cherry-pick this pr to a target branch, please comments '/pulsarbot cherry-pick to branch-x.y'."
    fi

    if [[ "" == "${GITHUB_TOKEN}" ]]; then
        curl --request POST \
            --url ${COMMENTS_URL} \
            --data "{\"body\": \"${PROMPT_SENTENCE}\"}"
    else
        curl --request POST \
            --url ${COMMENTS_URL} \
            --header "Authorization: token ${GITHUB_TOKEN}" \
            --data "{\"body\": \"${PROMPT_SENTENCE}\"}"
    fi
}

echo ${1}
case ${1} in
    cherry-pick)
        shift
        configure_args ${@}
        git_setup
        cherrypick_args
        cherrypick
        ;;
    prompt-comment)
        shift
        configure_args ${@}
        pr_close_prompt_args
        pr_close_prompt
        ;;
esac

