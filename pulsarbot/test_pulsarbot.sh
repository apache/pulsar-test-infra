#!/bin/bash
PRNUM=${1:-99999}
echo "Using PRNUM=$PRNUM"
cat > /tmp/testevent.json$$ <<EOF
{
  "comment": {
    "body": "${COMMENT_BODY:-"/pulsarbot rerun-failure-checks"}"
  },
  "issue": {
    "number": $PRNUM
  }
}
EOF
echo "Building docker image..."
docker build -t pulsarbot . || exit 1
docker run -v /tmp/testevent.json$$:/tmp/testevent.json -e TESTMODE="${TESTMODE:-1}" -e GITHUB_TOKEN -e GITHUB_EVENT_PATH=/tmp/testevent.json pulsarbot
rm /tmp/testevent.json$$
