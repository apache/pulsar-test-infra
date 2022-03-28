#!/bin/bash
printenv
echo "Exporting ACTIONS_RUNTIME_TOKEN and ACTIONS_RUNTIME_URL to GITHUB_ENV"
printf 'ACTIONS_RUNTIME_TOKEN<<EOF\n%s\nEOF\n' "${ACTIONS_RUNTIME_TOKEN}" >> $GITHUB_ENV
printf 'ACTIONS_RUNTIME_URL<<EOF\n%s\nEOF\n' "${ACTIONS_RUNTIME_URL}" >> $GITHUB_ENV
echo "Copy index.js to location in path as gh-actions-artifact-client.js"
mkdir -p ~/.local/bin
echo "#!/usr/bin/env node" > ~/.local/bin/gh-actions-artifact-client.js
cat /index.js >> ~/.local/bin/gh-actions-artifact-client.js
chmod a+rx ~/.local/bin/gh-actions-artifact-client.js
echo "Add gh-actions-artifact-client.js to GITHUB_PATH"
echo "${RUNNER_TEMP}/_github_home/.local/bin" >> $GITHUB_PATH
