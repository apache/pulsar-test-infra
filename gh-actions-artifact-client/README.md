# GitHub Actions Artifact client v2

Provides command line access to GitHub Actions Artifact upload / download.

The benefit is that any command can be used to produce the artifact and any command can be used to consume the artifact.

The upload is streamed from stdin and the download is streamed to stdout.
This makes it possible to use `docker save` and `docker load` to work efficiently with GitHub Actions Artifacts.

### Usage

It is necessary to set up the required tokens and script once in a build job:
```yaml
- uses: lhotari/gh-actions-artifact-client@v2
```

After this, `gh-actions-artifact-client.js` will be available in run scripts.

*uploading* - stores stdin input as multiple files under the given artifact name

```shell
some_command | gh-actions-artifact-client.js upload artifact_name
```

*downloading* - retries the given artifact and outputs to stdout.
This is meant to be used only for artifacts that were uploaded in the same format.

```shell
gh-actions-artifact-client.js download artifact_name | some_command
```

### Usage tips

You can download artifacts from the GitHub Actions UI after the workflow has finished.
GitHub Actions UI will return the files with a name that ends in `.zip`, however the content is not a zip file.

For example, if these commands were used in a GitHub Actions Workflow to share files:

uploading

```shell
tar -I zstd -cf - -C /some/directory . | gh-actions-artifact-client.js upload files.tar.zst
```

downloading

```shell
gh-actions-artifact-client.js download files.tar.zst | tar -I zstd -xf - -C /some/directory
```

This would be the way to extract the files by downloading the artifact as a zip file in GitHub Actions UI and then entering these commands:

```shell
tar -I zstd -xf ~/Downloads/files.tar.zst.zip -C /some/directory
```

### Development testing

There are a few unit tests with limited assertions

```shell
npm test
```

Unit tests use [nock](https://github.com/nock/nock) HTTP server mocking.

### Manual development testing

Commands that were used to do manual verification on GitHub Actions runner VM.
[action-upterm](https://github.com/lhotari/action-upterm) was used to open a ssh session to the runner VM for testing.

```shell
git clone https://github.com/lhotari/gh-actions-artifact-client
cd gh-actions-artifact-client/
sudo chown $USER /mnt
dd if=/dev/random of=/mnt/testfile2 bs=1M count=600
sudo apt install pv
pv /mnt/testfile2 |node dist/index.js upload testfile2
node dist/index.js download testfile2 |pv > /mnt/testfile2_downloaded
md5sum /mnt/testfile2
md5sum /mnt/testfile2_downloaded
```
