import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'
import DeleteHttpClient from '../src/delete-http-client.js'
const stream = require('stream')
const nock = require('nock')
const ExtendedDownloadHttpClient = require('../src/download-http-client.js')

test('delete test', async () => {
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
          url: 'http://localhost:12345/test_apis/pipelines/1/runs/123/artifacts?artifactName=test'
        }
      ]
    })
  mockserver
    .delete('/test_apis/pipelines/1/runs/123/artifacts?artifactName=test')
    .reply(200)
  const artifactName = 'test'
  const deleteHttpClient = new DeleteHttpClient()
  await deleteHttpClient.deleteArtifacts(artifactName)
})
