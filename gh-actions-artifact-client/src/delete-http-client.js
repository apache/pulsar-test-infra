const utils = require('@actions/artifact/lib/internal/utils.js')

class DeleteHttpClient {
  async deleteArtifacts(artifactNamePattern) {
    const httpClient = utils.createHttpClient('@actions/artifact-download')
    try {
      const artifacts = await this.listArtifacts(httpClient)
      if (artifacts.count === 0) {
        throw new Error(
          `Unable to find any artifacts for the associated workflow`
        )
      }
      const artifactsToDelete = artifacts.value.filter(artifact => {
        return artifact.name.match(artifactNamePattern)
      })
      if (!artifactsToDelete) {
        throw new Error(
          `Unable to find artifacts matching ${artifactNamePattern}`
        )
      }

      for (const artifactToDelete of artifactsToDelete) {
        await this.deleteArtifact(
          httpClient,
          artifactToDelete.name,
          artifactToDelete.url
        )
      }
    } finally {
      httpClient.dispose()
    }
  }

  async listArtifacts(httpClient) {
    const artifactUrl = utils.getArtifactUrl()
    const headers = utils.getDownloadHeaders()
    const response = await httpClient.get(artifactUrl, headers)
    const body = await response.readBody()
    return JSON.parse(body)
  }

  async deleteArtifact(httpClient, artifactName, artifactLocation) {
    const headers = utils.getDownloadHeaders()
    console.log(`Deleting ${artifactName} at ${artifactLocation}`)
    await httpClient.del(artifactLocation, headers)
  }
}

module.exports = DeleteHttpClient
