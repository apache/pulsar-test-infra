import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'
const stream = require('stream')
const nock = require('nock')
const ExtendedDownloadHttpClient = require('../src/download-http-client.js')

test('download test', async () => {
  process.env.ACTIONS_RUNTIME_TOKEN = 'token'
  process.env.ACTIONS_RUNTIME_URL = 'http://localhost:12345/test'
  process.env.GITHUB_RUN_ID = 123

  const mockserver = nock('http://localhost:12345').persist()

  mockserver
    .get('/test_apis/pipelines/workflows/123/artifacts?api-version=6.0-preview')
    .reply(200, {
      value: [
        {
          name: 'test',
          fileContainerResourceUrl: 'http://localhost:12345/fileContainer'
        }
      ]
    })
  mockserver.get('/fileContainer?itemPath=test').reply(200, {
    value: [
      {
        itemType: 'file',
        path: 'test/part000',
        contentLocation: 'http://localhost:12345/fileContent0'
      },
      {
        itemType: 'file',
        path: 'test/part001',
        contentLocation: 'http://localhost:12345/fileContent1'
      }
    ]
  })
  mockserver.get('/fileContent0').reply(200, 'Hello', {
    'Content-Length': (req, res, body) => body.length
  })
  mockserver.get('/fileContent1').reply(200, ' world!', {
    'Content-Length': (req, res, body) => body.length
  })
  const artifactName = 'test'
  const downloadHttpClient = new ExtendedDownloadHttpClient(2000)
  var testOutput = new stream.Writable()
  testOutput._write = function (chunk, encoding, done) {
    console.error(`output: '${chunk.toString()}'`)
    done()
  }
  await downloadHttpClient.downloadStream(artifactName, testOutput)
})
