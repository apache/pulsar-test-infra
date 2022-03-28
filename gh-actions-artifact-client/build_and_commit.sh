#!/bin/bash
ACTIONS_CORE_JS_FILE=./node_modules/@actions/core/lib/core.js
if ! grep -q '//#patched' $ACTIONS_CORE_JS_FILE; then
  echo '//#patched' >> $ACTIONS_CORE_JS_FILE
  for key in debug setOutput notice; do
      echo "exports.${key}=() => {};" >> $ACTIONS_CORE_JS_FILE
  done
  for key in info error warning; do
      echo "exports.${key}=(message) => process.stderr.write(message + os.EOL);" >> $ACTIONS_CORE_JS_FILE
  done
fi
npm run package  && git add dist/* && git commit -m 'Build'
