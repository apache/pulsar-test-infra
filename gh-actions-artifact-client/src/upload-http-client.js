const UploadHttpClient = require('@actions/artifact/lib/internal/upload-http-client.js')
const path_and_artifact_name_validation = require('@actions/artifact/lib/internal/path-and-artifact-name-validation.js')
const config_variables = require('@actions/artifact/lib/internal/config-variables.js')
const stream = require('stream')
const url = require('url')

const MAX_CHUNK_SIZE = config_variables.getUploadChunkSize()
const DEFAULT_PART_SIZE = 256 * 1024 * 1024 // 256MB

class ExtendedUploadHttpClient extends UploadHttpClient.UploadHttpClient {
  chunkSize = MAX_CHUNK_SIZE
  partSize = Math.max(DEFAULT_PART_SIZE, this.chunkSize)

  constructor(options) {
    super()
    if (options) {
      if (options.chunkSize && options.chunkSize > 0) {
        this.chunkSize = Math.min(MAX_CHUNK_SIZE, options.chunkSize)
      } else {
        this.chunkSize = MAX_CHUNK_SIZE
      }
      if (options.partSize && options.partSize > 0) {
        this.partSize = Math.max(options.partSize, this.chunkSize)
      } else {
        this.partSize = DEFAULT_PART_SIZE
      }
    }
  }

  /**
   * Uploads a stream to GitHub Artifacts as multiple files that are named "part000, part001, part002..."
   */
  async uploadStream(name, inputStream, options) {
    path_and_artifact_name_validation.checkArtifactName(name)
    const response = await this.createArtifactInFileContainer(name, options)
    if (!response.fileContainerResourceUrl) {
      throw new Error(
        'No URL provided by the Artifact Service to upload an artifact to'
      )
    }

    const streamUploader = new StreamUploader(
      name,
      response.fileContainerResourceUrl,
      this.partSize,
      this.chunkSize,
      async (
        httpClientIndex,
        resourceUrl,
        openStream,
        start,
        end,
        uploadFileSize,
        isGzip,
        totalFileSize
      ) => {
        return await this.uploadChunk(
          httpClientIndex,
          resourceUrl,
          openStream,
          start,
          end,
          uploadFileSize,
          isGzip,
          totalFileSize
        )
      }
    )

    await new Promise(resolve => {
      inputStream.on('data', async data => {
        await streamUploader.onData(
          data,
          async flushFunctionToExecuteWhilePaused => {
            inputStream.pause()
            await flushFunctionToExecuteWhilePaused()
            inputStream.resume()
          }
        )
      })
      inputStream.on('end', async () => {
        await streamUploader.flush()
        resolve()
      })
    })

    await this.patchArtifactSize(streamUploader.totalSize, name)
  }
}

class StreamUploader {
  artifactName
  fileContainerResourceUrl
  partBuffer
  partBufferIndex = 0
  partNumber = 0
  chunkSize
  totalSize = 0
  uploadChunkFunction

  constructor(
    artifactName,
    fileContainerResourceUrl,
    partSize,
    chunkSize,
    uploadChunkFunction
  ) {
    this.artifactName = artifactName
    this.fileContainerResourceUrl = new url.URL(fileContainerResourceUrl)
    this.partBuffer = Buffer.alloc(partSize)
    this.chunkSize = chunkSize
    this.uploadChunkFunction = uploadChunkFunction
    this.updateResourceUrl()
  }

  updateResourceUrl() {
    this.fileContainerResourceUrl.searchParams.set(
      'itemPath',
      `${this.artifactName}/part${this.partNumber.toString().padStart(3, 0)}`
    )
    this.resourceUrl = this.fileContainerResourceUrl.toString()
  }

  async onData(data, pauseWhileExecuting) {
    let remainingBytes = data.length
    let dataIndex = 0
    while (remainingBytes > 0) {
      const readBytes = Math.min(
        remainingBytes,
        this.partBuffer.length - this.partBufferIndex
      )
      data.copy(
        this.partBuffer,
        this.partBufferIndex,
        dataIndex,
        dataIndex + readBytes
      )
      this.partBufferIndex += readBytes
      dataIndex += readBytes
      remainingBytes -= readBytes
      if (this.partBufferIndex == this.partBuffer.length) {
        await pauseWhileExecuting(async () => {
          await this.flush()
        })
      }
    }
  }

  async flush() {
    if (this.partBufferIndex > 0) {
      this.totalSize += this.partBufferIndex
      const currentBufferIndex = this.partBufferIndex
      this.partBufferIndex = 0
      const currentResourceUrl = this.resourceUrl
      this.partNumber++
      this.updateResourceUrl()
      await this.uploadPartBuffer(currentResourceUrl, currentBufferIndex)
    }
  }

  async uploadPartBuffer(resourceUrl, partBufferIndex) {
    let remainingBytes = partBufferIndex
    let readIndex = 0
    while (remainingBytes > 0) {
      const readBytes = Math.min(remainingBytes, this.chunkSize)
      await this.uploadBuffer(
        resourceUrl,
        readIndex,
        readBytes,
        partBufferIndex
      )
      readIndex += readBytes
      remainingBytes -= readBytes
    }
  }

  async uploadBuffer(resourceUrl, startIndex, chunkLength, totalSize) {
    const bufSlice = this.partBuffer.slice(startIndex, startIndex + chunkLength)
    const endIndex = startIndex + chunkLength - 1
    const result = await this.uploadChunkFunction(
      0,
      resourceUrl,
      () => {
        const passThrough = new stream.PassThrough()
        passThrough.end(bufSlice)
        return passThrough
      },
      startIndex,
      endIndex,
      totalSize,
      false,
      0
    )
    if (!result) {
      throw new Error(
        `File upload failed for ${resourceUrl} range ${startIndex}-${endIndex}/${totalSize}`
      )
    }
    return result
  }
}

module.exports = ExtendedUploadHttpClient
