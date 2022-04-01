#!/bin/bash
export ACTIONS_RUNTIME_TOKEN=test_token
export ACTIONS_RUNTIME_URL=http://localhost:12345/test_url
export GITHUB_ENV=/tmp/github_env
export GITHUB_PATH=/tmp/github_path
export RUNNER_TEMP=/tmp/runner_temp
node dist/install.js
