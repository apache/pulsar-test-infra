require('yargs')
  .command({
    command: 'upload <artifactName>',
    desc: 'upload an artifact',
    builder: yargs =>
      yargs
        .positional('artifactName', {
          type: 'string',
          describe: 'artifact name',
          demandOption: 'true'
        })
        .option('retentionDays', {
          alias: 'r',
          description: 'retention days',
          type: 'number',
          default: 1
        }).option('contentType', {
          description: 'Content type',
          type: 'string',
          default: 'application/octet-stream'
        }),
    handler: argv => {
      const artifactName = argv.artifactName
      const uploadHttpClient = require('./upload-http-client.js')
      uploadHttpClient.uploadStream(artifactName, process.stdin, {
        retentionDays: argv.retentionDays,
        contentType: argv.contentType
      })
    }
  })
  .command({
    command: 'download <artifactName>',
    desc: 'download an artifact',
    builder: yargs =>
      yargs.positional('artifactName', {
        type: 'string',
        describe: 'artifact name',
        demandOption: 'true'
      }),
    handler: argv => {
      const artifactName = argv.artifactName
      const downloadHttpClient = require('./download-http-client.js')
      downloadHttpClient.downloadStream(artifactName, process.stdout)
    }
  })
  .command({
    command: 'delete <artifactName>',
    desc: 'delete an artifact',
    builder: yargs =>
      yargs.positional('artifactName', {
        type: 'string',
        describe: 'artifact name',
        demandOption: 'true'
      }),
    handler: argv => {
      const deleteHttpClient = require('./delete-http-client.js')
      deleteHttpClient.deleteArtifact(argv.artifactName)
    }
  })
  .help()
  .alias('help', 'h').argv
  