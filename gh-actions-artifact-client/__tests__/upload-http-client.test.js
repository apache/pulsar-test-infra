import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'
const stream = require('stream')
const nock = require('nock')

test('upload test', async () => {
  process.env.ACTIONS_RUNTIME_TOKEN = 'token'
  process.env.ACTIONS_RUNTIME_URL = 'http://localhost:12345/test'
  process.env.GITHUB_RUN_ID = 123

  const mockserver = nock('http://localhost:12345').persist()
  mockserver
    .post(
      '/test_apis/pipelines/workflows/123/artifacts?api-version=6.0-preview'
    )
    .reply(200, {
      fileContainerResourceUrl: 'http://localhost:12345/fileContainer'
    })

  mockserver
    .patch(
      '/test_apis/pipelines/workflows/123/artifacts?api-version=6.0-preview&artifactName=test'
    )
    .reply(200, {})

  mockserver.put('/fileContainer').query(true).reply(200, {})

  const passThrough = new stream.PassThrough()
  const buf = Buffer.alloc(2000)
  passThrough.end(buf)

  const ExtendedUploadHttpClient = require('../src/upload-http-client.js')
  const artifactName = 'test'
  const uploadHttpClient = new ExtendedUploadHttpClient({
    chunkSize: 97,
    partSize: 500
  })
  await uploadHttpClient.uploadStream(artifactName, passThrough, {
    retentionDays: 1
  })
})
