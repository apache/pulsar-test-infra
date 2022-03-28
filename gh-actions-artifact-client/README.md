# GitHub Actions Artifact client

Provides command line access to GitHub Actions Artifact upload / download.

The benefit is that any command can be used to produce the artifact and any command can be used to consume the artifact.

The upload is streamed from stdin and the download is streamed to stdout.

This makes it possible to use `docker save` and `docker load` to work efficiently with GitHub Actions Artifacts.

### Usage

It is necessary to set up the required tokens and script once in a build job:
```yaml
- uses: lhotari/gh-actions-artifact-client/dist@master
```

After this, `gh-actions-artifact-client.js` will be available in run scripts.

*uploading* - stores stdin input as multiple files under the given artifact name
```bash
some_command | gh-actions-artifact-client.js upload artifact_name
```

*downloading* - retries the given artifact and outputs to stdout.
This is meant to be used only for artifacts that were uploaded in the same format.

```bash
gh-actions-artifact-client.js download artifact_name | some_command
```

Uploading and downloading requires about 600MB RAM with the default settings.
In uploading, the stream is split into multiple file parts where each part is of the size of 256MB.
The reason for this is the limitation of GitHub Actions Artifacts where the uploaded files must have a predefined size. The streaming will buffer into memory so that parts are fully contained before they are uploaded.

### Development testing

There are a few unit tests with limited assertions
```
npm test
```
Unit tests use [nock](https://github.com/nock/nock) HTTP server mocking.

### Manual development testing

Commands that were used to do manual verification on GitHub Actions runner VM.
[action-upterm](https://github.com/lhotari/action-upterm) was used to open a ssh session to the runner VM for testing.

```bash
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
