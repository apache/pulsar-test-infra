const { debug, info } = require('@actions/core');
const { internalArtifactTwirpClient } = require('@actions/artifact/lib/internal/shared/artifact-twirp-client');
const { getBackendIdsFromToken } = require('@actions/artifact/lib/internal/shared/util');
const { StringValue } = require('@actions/artifact/lib/generated');
const { ArtifactNotFoundError } = require('@actions/artifact/lib/internal/shared/errors');

async function deleteArtifact(artifactName) {
  const artifactClient = internalArtifactTwirpClient();
  const { workflowRunBackendId, workflowJobRunBackendId } = getBackendIdsFromToken();

  // List artifacts to find the one we want to delete
  const listReq = {
    workflowRunBackendId,
    workflowJobRunBackendId,
    nameFilter: StringValue.create({ value: artifactName })
  };
  const listRes = await artifactClient.ListArtifacts(listReq);

  if (listRes.artifacts.length === 0) {
    throw new ArtifactNotFoundError(`Artifact not found for name: ${artifactName}`);
  }

  let artifact = listRes.artifacts[0];
  if (listRes.artifacts.length > 1) {
    artifact = listRes.artifacts.sort((a, b) => Number(b.databaseId) - Number(a.databaseId))[0];
    debug(`More than one artifact found for a single name, returning newest (id: ${artifact.databaseId})`);
  }

  // Delete the artifact
  const deleteReq = {
    workflowRunBackendId: artifact.workflowRunBackendId,
    workflowJobRunBackendId: artifact.workflowJobRunBackendId,
    name: artifact.name
  };
  const deleteRes = await artifactClient.DeleteArtifact(deleteReq);

  info(`Artifact '${artifactName}' (ID: ${deleteRes.artifactId}) deleted`);

  return {
    artifactId: Number(deleteRes.artifactId)
  };
}

module.exports = {
  deleteArtifact
};
