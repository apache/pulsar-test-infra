import * as process from 'process'
import { expect, test } from '@jest/globals'
const stream = require('stream')
const nock = require('nock')
const { downloadStream } = require('../src/download-http-client.js')
const { getBackendIdsFromToken } = require('@actions/artifact/lib/internal/shared/util');

const testRuntimeToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwic2NwIjoiQWN0aW9ucy5FeGFtcGxlIEFjdGlvbnMuQW5vdGhlckV4YW1wbGU6dGVzdCBBY3Rpb25zLlJlc3VsdHM6Y2U3ZjU0YzctNjFjNy00YWFlLTg4N2YtMzBkYTQ3NWY1ZjFhOmNhMzk1MDg1LTA0MGEtNTI2Yi0yY2U4LWJkYzg1ZjY5Mjc3NCIsImlhdCI6MTUxNjIzOTAyMn0.XYnI_wHPBlUi1mqYveJnnkJhp4dlFjqxzRmISPsqfw8'

test('download test', async () => {
  process.env.ACTIONS_RUNTIME_TOKEN = testRuntimeToken
  process.env.ACTIONS_RUNTIME_URL = 'http://localhost:12345/test'
  process.env.ACTIONS_RESULTS_URL = 'http://localhost:12345/results'
  process.env.GITHUB_RUN_ID = 123

  const { workflowRunBackendId, workflowJobRunBackendId } = getBackendIdsFromToken();

  const mockserver = nock('http://localhost:12345').persist()
  mockserver
    .get('/download')
    .reply(200, 'Hello, world!', {
      'Content-Length': 13
    })

  mockserver
    .post('/twirp/github.actions.results.api.v1.ArtifactService/ListArtifacts')
    .reply(200, {
      artifacts: [
        {
          workflowRunBackendId: workflowRunBackendId,
          workflowJobRunBackendId: workflowJobRunBackendId,
          name: 'test'
        }
      ]
    })

  mockserver
    .post('/twirp/github.actions.results.api.v1.ArtifactService/GetSignedArtifactURL')
    .query(true)
    .reply(200, {
      signedUrl: 'http://localhost:12345/download'
    })

  const artifactName = 'test'
  const testOutput = new stream.Writable()
  let downloadedContent = ''
  testOutput._write = function (chunk, encoding, done) {
    downloadedContent += chunk.toString()
    done()
  }

  await downloadStream(artifactName, testOutput)

  expect(downloadedContent).toBe('Hello, world!')
})
