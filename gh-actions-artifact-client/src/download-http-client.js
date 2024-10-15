const core = require('@actions/core');
const { internalArtifactTwirpClient } = require('@actions/artifact/lib/internal/shared/artifact-twirp-client');
const { StringValue } = require('@actions/artifact/lib/generated');
const { getBackendIdsFromToken } = require('@actions/artifact/lib/internal/shared/util');
const { ArtifactNotFoundError } = require('@actions/artifact/lib/internal/shared/errors');
const httpClient = require('@actions/http-client');
const { getUserAgentString } = require('@actions/artifact/lib/internal/shared/user-agent');

async function downloadStream(name, outputStream) {
  const artifactClient = internalArtifactTwirpClient();
  const { workflowRunBackendId, workflowJobRunBackendId } = getBackendIdsFromToken();

  const listReq = {
    workflowRunBackendId,
    workflowJobRunBackendId,
    nameFilter: StringValue.create({ value: name })
  };

  const { artifacts } = await artifactClient.ListArtifacts(listReq);

  if (artifacts.length === 0) {
    throw new ArtifactNotFoundError(`No artifacts found with name: ${name}`);
  }

  if (artifacts.length > 1) {
    core.warning('Multiple artifacts found, defaulting to first.');
  }

  const signedReq = {
    workflowRunBackendId: artifacts[0].workflowRunBackendId,
    workflowJobRunBackendId: artifacts[0].workflowJobRunBackendId,
    name: artifacts[0].name
  };

  const { signedUrl } = await artifactClient.GetSignedArtifactURL(signedReq);

  core.info(`Downloading artifact from: ${new URL(signedUrl).origin}`);

  const client = new httpClient.HttpClient(getUserAgentString());
  const response = await client.get(signedUrl);

  if (response.message.statusCode !== 200) {
    throw new Error(`Unexpected HTTP response: ${response.message.statusCode} ${response.message.statusMessage}`);
  }

  return new Promise((resolve, reject) => {
    response.message
      .pipe(outputStream)
      .on('finish', resolve)
      .on('error', reject);
  });
}

module.exports = {
  downloadStream
};
