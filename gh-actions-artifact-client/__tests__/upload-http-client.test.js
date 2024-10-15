import * as process from 'process'
import {expect, test} from '@jest/globals'
const stream = require('stream')
const nock = require('nock')
const testRuntimeToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwic2NwIjoiQWN0aW9ucy5FeGFtcGxlIEFjdGlvbnMuQW5vdGhlckV4YW1wbGU6dGVzdCBBY3Rpb25zLlJlc3VsdHM6Y2U3ZjU0YzctNjFjNy00YWFlLTg4N2YtMzBkYTQ3NWY1ZjFhOmNhMzk1MDg1LTA0MGEtNTI2Yi0yY2U4LWJkYzg1ZjY5Mjc3NCIsImlhdCI6MTUxNjIzOTAyMn0.XYnI_wHPBlUi1mqYveJnnkJhp4dlFjqxzRmISPsqfw8'

// Mock the @azure/storage-blob module
jest.mock('@azure/storage-blob', () => {
  return {
    BlobClient: jest.fn().mockImplementation(() => ({
      getBlockBlobClient: jest.fn().mockReturnThis(),
      uploadStream: jest.fn().mockImplementation((stream, bufferSize, maxConcurrency, options) => {
        return new Promise((resolve) => {
          let totalBytes = 0;
          stream.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (options && options.onProgress) {
              options.onProgress({ loadedBytes: totalBytes });
            }
          });
          stream.on('end', () => {
            resolve({});
          });
          stream.resume(); // Start flowing mode to consume the stream
        });
      })
    }))
  }
})

test('upload test', async () => {
  process.env.ACTIONS_RUNTIME_TOKEN = testRuntimeToken
  process.env.ACTIONS_RUNTIME_URL = 'http://localhost:12345/test'
  process.env.ACTIONS_RESULTS_URL = 'http://localhost:12345/results'
  process.env.GITHUB_RUN_ID = 123

  const fakeSignedUploadUrl = 'https://fakestorageaccount.blob.core.windows.net/container/blob?sv=2020-08-04&st=2023-04-13T18%3A00%3A00Z&se=2023-04-13T19%3A00%3A00Z&sr=b&sp=rw&sig=fakeSignature'

  const mockserver = nock('http://localhost:12345').persist()
  mockserver
    .post(
      '/twirp/github.actions.results.api.v1.ArtifactService/CreateArtifact'
    )
    .reply(200, {
      ok: true,
      signedUploadUrl: fakeSignedUploadUrl
    })

    mockserver
    .post(
      '/twirp/github.actions.results.api.v1.ArtifactService/FinalizeArtifact'
    )
    .query(true)
    .reply(200, {
      ok: true,
      artifactId: '123',
    })

  const passThrough = new stream.PassThrough()
  const buf = Buffer.alloc(2000)
  passThrough.end(buf)
  const uploadHttpClient = require('../src/upload-http-client.js')
  const artifactName = 'test'
  const result = await uploadHttpClient.uploadStream(artifactName, passThrough, {
    retentionDays: 1
  })
  expect(result.id).toBe(123)
  expect(result.name).toBe('test')
  expect(result.size).toBe(2000)
  expect(result.sha256).toBe('2da42fb1d7bd8524e83d5a1e332bad697c8769ba430770a19bec630eb8ffcaa8')
  const { BlobClient } = require('@azure/storage-blob')
  const mockBlobClient = BlobClient.mock.results[0].value
  expect(mockBlobClient.getBlockBlobClient).toHaveBeenCalled()
  expect(mockBlobClient.getBlockBlobClient().uploadStream).toHaveBeenCalled()
})
