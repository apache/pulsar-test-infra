FROM alpine:latest

LABEL version="1.0.0"
LABEL repository="http://github.com/apache/pulsar-test-infra"
LABEL homepage="http://github.com/apache/pulsar-test-infra/pulsarbot"
LABEL maintainer="Apache Pulsar Team"
LABEL "com.github.actions.name"="pulsarbot"
LABEL "com.github.actions.description"="Pulsar Bot"
LABEL "com.github.actions.icon"="git-commit"
LABEL "com.github.actions.color"="gray-dark"

RUN apk add --update git jq bash curl coreutils && rm -rf /var/cache/apk/*

RUN curl -LO -s https://github.com/cli/cli/releases/download/v1.2.0/gh_1.2.0_linux_386.tar.gz && \
    tar -xf gh_1.2.0_linux_386.tar.gz

ENV PATH=${PATH}:/gh_1.2.0_linux_386/bin

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
