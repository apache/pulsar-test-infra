const { validateArtifactName } = require('@actions/artifact/lib/internal/upload/path-and-artifact-name-validation');
const stream = require('stream');
const crypto = require('crypto');
const core = require('@actions/core');
const { BlobClient } = require('@azure/storage-blob');
const { internalArtifactTwirpClient } = require('@actions/artifact/lib/internal/shared/artifact-twirp-client');
const { getBackendIdsFromToken } = require('@actions/artifact/lib/internal/shared/util');
const errors = require('@actions/artifact/lib/internal/shared/errors');
const { StringValue } = require('@actions/artifact/lib/generated');
const config = require('@actions/artifact/lib/internal/shared/config');
const retention = require("@actions/artifact/lib/internal/upload/retention");

async function uploadStream(name, inputStream, options) {
  validateArtifactName(name);

  const { retentionDays, contentType } = options;

  core.info(`Starting artifact upload for ${name}`);

  // Get the backend IDs
  const backendIds = getBackendIdsFromToken();

  // Create the artifact client
  const artifactClient = internalArtifactTwirpClient();

  // Create the artifact
  const createArtifactReq = {
    workflowRunBackendId: backendIds.workflowRunBackendId,
    workflowJobRunBackendId: backendIds.workflowJobRunBackendId,
    name,
    version: 4
  };

  if (retentionDays) {
    createArtifactReq.expiresAt = retention.getExpiration(retentionDays);
  }

  const createArtifactResp = await artifactClient.CreateArtifact(createArtifactReq);
  if (!createArtifactResp.ok) {
    throw new errors.InvalidResponseError('CreateArtifact: response from backend was not ok');
  }

  const signedUploadUrl = createArtifactResp.signedUploadUrl;
  const blobClient = new BlobClient(signedUploadUrl);
  const blockBlobClient = blobClient.getBlockBlobClient();  

  const maxConcurrency = config.getConcurrency();
  const bufferSize = config.getUploadChunkSize();

  let uploadByteCount = 0;
  let lastProgressTime = Date.now();
  const abortController = new AbortController();

  const uploadCallback = (progress) => {
    uploadByteCount = progress.loadedBytes;
    lastProgressTime = Date.now();
  };

  const uploadOptions = {
    blobHTTPHeaders: { blobContentType: contentType },
    onProgress: uploadCallback,
    abortSignal: abortController.signal
  };

  const uploadStream = new stream.PassThrough();
  const hashStream = crypto.createHash('sha256');

  inputStream.pipe(uploadStream);
  inputStream.pipe(hashStream).setEncoding('hex');

  core.info('Beginning upload of artifact content to blob storage');

  const timerPromise = chunkTimer(config.getUploadChunkTimeout(), () => lastProgressTime, abortController);
  try {
    const uploadPromise = blockBlobClient.uploadStream(uploadStream, bufferSize, maxConcurrency, uploadOptions);
    await Promise.race([uploadPromise, timerPromise]);
  } catch (error) {
    if (errors.NetworkError.isNetworkErrorCode(error.code)) {
      throw new errors.NetworkError(error.code);
    }
    throw error;
  } finally {
    abortController.abort(); // Ensure everything is cleaned up
    await timerPromise;
  }

  core.info('Finished uploading artifact content to blob storage!');
  
  hashStream.end();
  const sha256Hash = hashStream.read();

  core.info(`SHA256 hash of uploaded artifact zip is ${sha256Hash}`);

  if (uploadByteCount === 0) {
    core.warning(`No data was uploaded to blob storage. Reported upload byte count is 0.`);
  }

  // Finalize the artifact
  const finalizeArtifactReq = {
    workflowRunBackendId: backendIds.workflowRunBackendId,
    workflowJobRunBackendId: backendIds.workflowJobRunBackendId,
    name,
    size: uploadByteCount.toString()
  };

  if (sha256Hash) {
    finalizeArtifactReq.hash = StringValue.create({
      value: `sha256:${sha256Hash}`
    });
  }

  core.info(`Finalizing artifact upload for ${name}`);
  const finalizeArtifactResp = await artifactClient.FinalizeArtifact(finalizeArtifactReq);
  if (!finalizeArtifactResp.ok) {
    throw new errors.InvalidResponseError('FinalizeArtifact: response from backend was not ok');
  }

  const artifactId = finalizeArtifactResp.artifactId;
  core.info(`Artifact ${name} successfully finalized. Artifact ID ${artifactId}`);

  return {
    size: uploadByteCount,
    sha256: sha256Hash,
    name: name,
    id: Number(artifactId)
  };
}

function chunkTimer(interval, getLastProgressTime, abortController) {
  return new Promise((resolve, reject) => {
    const checkProgress = () => {
      if (Date.now() - getLastProgressTime() > interval) {
        clearInterval(timer);
        reject(new Error('Upload progress stalled.'));
        abortController.abort();
      }
    };

    const timer = setInterval(checkProgress, 1000); // Check every second

    abortController.signal.addEventListener('abort', () => {
      clearInterval(timer);
      resolve();
    }, { once: true });
  });
}

module.exports = {
  uploadStream
};