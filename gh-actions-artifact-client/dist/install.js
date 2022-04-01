const fs = require('fs')
const path = require('path')

async function run() {
  console.log(
    'Exporting ACTIONS_RUNTIME_TOKEN and ACTIONS_RUNTIME_URL to GITHUB_ENV'
  )
  fs.appendFileSync(
    process.env.GITHUB_ENV,
    `ACTIONS_RUNTIME_TOKEN<<EOF\n${process.env.ACTIONS_RUNTIME_TOKEN}\nEOF\nACTIONS_RUNTIME_URL<<EOF\n${process.env.ACTIONS_RUNTIME_URL}\nEOF\n`
  )
  console.log(
    'Copy index.js to location in path as gh-actions-artifact-client.js'
  )
  const localBinPath = path.resolve(
    process.env.RUNNER_TEMP,
    '_github_home/.local/bin'
  )
  fs.mkdirSync(localBinPath, {recursive: true})
  const clientJsPath = path.resolve(
    localBinPath,
    'gh-actions-artifact-client.js'
  )
  const clientJsContent = fs.readFileSync(
    path.resolve(__dirname, 'index.js'),
    'UTF-8'
  )
  fs.writeFileSync(clientJsPath, `#!/usr/bin/env node\n${clientJsContent}`, {
    encoding: 'UTF-8',
    mode: '755'
  })
  console.log('Add gh-actions-artifact-client.js to GITHUB_PATH')
  fs.appendFileSync(process.env.GITHUB_PATH, `${localBinPath}\n`)
}

run()
