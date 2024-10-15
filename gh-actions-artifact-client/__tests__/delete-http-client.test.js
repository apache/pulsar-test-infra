import { expect, test } from '@jest/globals'
import nock from 'nock'
import { deleteArtifact } from '../src/delete-http-client.js'
import { getBackendIdsFromToken } from '@actions/artifact/lib/internal/shared/util'

const testRuntimeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwic2NwIjoiQWN0aW9ucy5FeGFtcGxlIEFjdGlvbnMuQW5vdGhlckV4YW1wbGU6dGVzdCBBY3Rpb25zLlJlc3VsdHM6Y2U3ZjU0YzctNjFjNy00YWFlLTg4N2YtMzBkYTQ3NWY1ZjFhOmNhMzk1MDg1LTA0MGEtNTI2Yi0yY2U4LWJkYzg1ZjY5Mjc3NCIsImlhdCI6MTUxNjIzOTAyMn0.XYnI_wHPBlUi1mqYveJnnkJhp4dlFjqxzRmISPsqfw8'

test('delete artifact test', async () => {
  process.env.ACTIONS_RUNTIME_TOKEN = testRuntimeToken
  process.env.ACTIONS_RUNTIME_URL = 'http://localhost:12345/test'
  process.env.ACTIONS_RESULTS_URL = 'http://localhost:12345/results'
  process.env.GITHUB_RUN_ID = '123'

  const { workflowRunBackendId, workflowJobRunBackendId } = getBackendIdsFromToken();

  const artifactName = 'test'
  const artifactId = '12345'

  const mockserver = nock('http://localhost:12345').persist()

  // Mock ListArtifacts endpoint
  mockserver
    .post('/twirp/github.actions.results.api.v1.ArtifactService/ListArtifacts')
    .reply(200, {
      artifacts: [
        {
          name: artifactName,
          workflowRunBackendId: workflowRunBackendId,
          workflowJobRunBackendId: workflowJobRunBackendId,
          databaseId: artifactId,
        },
      ],
    })

  // Mock DeleteArtifact endpoint
  mockserver
    .post('/twirp/github.actions.results.api.v1.ArtifactService/DeleteArtifact')
    .reply(200, {
      ok: true,
      artifactId: artifactId
    })

  const result = await deleteArtifact(artifactName)

  expect(result).toEqual({
    artifactId: Number(artifactId),
  })

  // Verify that the correct requests were made
  expect(mockserver.isDone()).toBe(true)
})
