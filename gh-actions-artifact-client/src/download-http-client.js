const DownloadHttpClient = require('@actions/artifact/lib/internal/download-http-client.js')
const utils = require('@actions/artifact/lib/internal/utils.js')
const config_variables = require('@actions/artifact/lib/internal/config-variables.js')
const download_specification = require('@actions/artifact/lib/internal/download-specification.js')

class ExtendedDownloadHttpClient extends DownloadHttpClient.DownloadHttpClient {
  constructor() {
    super()
  }

  async downloadStream(name, outputStream) {
    const artifacts = await this.listArtifacts()
    if (artifacts.count === 0) {
      throw new Error(
        `Unable to find any artifacts for the associated workflow`
      )
    }
    const artifactToDownload = artifacts.value.find(artifact => {
      return artifact.name === name
    })
    if (!artifactToDownload) {
      throw new Error(`Unable to find an artifact with the name: ${name}`)
    }
    const partNameRegex = new RegExp(`${name}/part\\d+`)
    const items = await this.getContainerItems(
      artifactToDownload.name,
      artifactToDownload.fileContainerResourceUrl
    )
    const entries = items.value
      .filter(entry => {
        return entry.path.match(partNameRegex)
      })
      .sort((a, b) => a.path.localeCompare(b.path))
    const downloadSpecification =
      download_specification.getDownloadSpecification(name, entries, '', false)
    if (downloadSpecification.filesToDownload.length === 0) {
      console.error(
        `No downloadable files were found for the artifact: ${artifactToDownload.name}`
      )
    } else {
      await this.downloadSingleArtifactToStream(
        downloadSpecification.filesToDownload,
        outputStream
      )
    }
  }

  async downloadSingleArtifactToStream(downloadItems, outputStream) {
    let currentFile = 0
    console.error(
      `Total number of files that will be downloaded: ${downloadItems.length}`
    )
    this.statusReporter.setTotalNumberOfFilesToProcess(downloadItems.length)
    this.statusReporter.start()
    try {
      while (currentFile < downloadItems.length) {
        const currentFileToDownload = downloadItems[currentFile]
        currentFile += 1
        await this.downloadIndividualFileToStream(
          0,
          currentFileToDownload.sourceLocation,
          outputStream
        )
        this.statusReporter.incrementProcessedCount()
      }
    } catch (error) {
      throw new Error(`Unable to download the artifact: ${error}`)
    } finally {
      this.statusReporter.stop()
      // safety dispose all connections
      this.downloadHttpManager.disposeAndReplaceAllClients()
    }
  }

  async downloadIndividualFileToStream(
    httpClientIndex,
    artifactLocation,
    outputStream
  ) {
    let retryCount = 0
    const retryLimit = config_variables.getRetryLimit()
    const headers = utils.getDownloadHeaders('application/json', true, true)
    // a single GET request is used to download a file
    const makeDownloadRequest = async () => {
      const client = this.downloadHttpManager.getClient(httpClientIndex)
      return await client.get(artifactLocation, headers)
    }
    // Increments the current retry count and then checks if the retry limit has been reached
    // If there have been too many retries, fail so the download stops. If there is a retryAfterValue value provided,
    // it will be used
    const backOff = async retryAfterValue => {
      retryCount++
      if (retryCount > retryLimit) {
        throw new Error(
          `Retry limit has been reached. Unable to download ${artifactLocation}`
        )
      } else {
        this.downloadHttpManager.disposeAndReplaceClient(httpClientIndex)
        if (retryAfterValue) {
          // Back off by waiting the specified time denoted by the retry-after header
          console.error(
            `Backoff due to too many requests, retry #${retryCount}. Waiting for ${retryAfterValue} milliseconds before continuing the download`
          )
          await utils.sleep(retryAfterValue)
        } else {
          // Back off using an exponential value that depends on the retry count
          const backoffTime =
            utils.getExponentialRetryTimeInMilliseconds(retryCount)
          console.error(
            `Exponential backoff for retry #${retryCount}. Waiting for ${backoffTime} milliseconds before continuing the download`
          )
          await utils.sleep(backoffTime)
        }
        console.error(
          `Finished backoff for retry #${retryCount}, continuing with download`
        )
      }
    }

    var partBuffer
    let partIndex = 0
    // keep trying to download a file until a retry limit has been reached
    while (retryCount <= retryLimit) {
      let response
      try {
        response = await makeDownloadRequest()
      } catch (error) {
        // if an error is caught, it is usually indicative of a timeout so retry the download
        console.error(
          'An error occurred while attempting to download a file',
          error
        )
        // increment the retryCount and use exponential backoff to wait before making the next request
        await backOff()
        continue
      }
      let forceRetry = false
      if (utils.isSuccessStatusCode(response.message.statusCode)) {
        try {
          const partSize = parseInt(response.message.headers['content-length'])
          if (!partBuffer || partBuffer.length != partSize) {
            partBuffer = Buffer.alloc(partSize)
          }
          partIndex = 0
          await new Promise((resolve, reject) => {
            response.message
              .on('error', error => {
                console.error(
                  `An error occurred while attempting to read the response stream`,
                  error
                )
                reject(error)
              })
              .on('data', chunk => {
                chunk.copy(partBuffer, partIndex)
                partIndex += chunk.length
              })
              .on('close', () => {
                resolve()
              })
          })
          if (partSize != partIndex) {
            console.error(
              `Didn't receive full file. received bytes ${partIndex} != expected bytes ${partSize}`
            )
          }
          break
        } catch (error) {
          forceRetry = true
        }
      }
      if (
        forceRetry ||
        utils.isRetryableStatusCode(response.message.statusCode)
      ) {
        console.error(
          `A ${response.message.statusCode} response code has been received while attempting to download an artifact`
        )
        // if a throttled status code is received, try to get the retryAfter header value, else differ to standard exponential backoff
        utils.isThrottledStatusCode(response.message.statusCode)
          ? await backOff(
              utils.tryGetRetryAfterValueTimeInMilliseconds(
                response.message.headers
              )
            )
          : await backOff()
      } else {
        // Some unexpected response code, fail immediately and stop the download
        utils.displayHttpDiagnostics(response)
        throw new Error(
          `Unexpected http ${response.message.statusCode} during download for ${artifactLocation}`
        )
      }
    }
    outputStream.write(partBuffer)
  }
}

module.exports = ExtendedDownloadHttpClient
