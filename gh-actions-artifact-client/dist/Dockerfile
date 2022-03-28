FROM alpine:latest
RUN apk add --update bash && rm -rf /var/cache/apk/*
COPY entrypoint.sh /entrypoint.sh
COPY index.js /index.js
ENTRYPOINT ["/entrypoint.sh"]
