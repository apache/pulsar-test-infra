FROM alpine:latest

LABEL version="1.0.0"
LABEL repository="http://github.com/sijie/pulsar-github-actions"
LABEL homepage="http://github.com/sijie/pulsar-github-actions/diff-only"
LABEL maintainer="Sijie Guo"
LABEL "com.github.actions.name"="Diff only"
LABEL "com.github.actions.description"="Stop workflow if changes were only made in certain files/directories."
LABEL "com.github.actions.icon"="git-commit"
LABEL "com.github.actions.color"="gray-dark"

RUN apk add --update git jq bash && rm -rf /var/cache/apk/*

COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]