# Apache Pulsar CI Tooling

This repository contains some custom GitHub Actions used in Apache Pulsar GitHub Actions workflows.

## GitHub Workflows in apache/pulsar using these actions

- [pulsar-ci.yaml](https://github.com/apache/pulsar/tree/master/.github/workflows/pulsar-ci.yaml)
- [pulsar-ci-flaky.yaml](https://github.com/apache/pulsar/tree/master/.github/workflows/pulsar-ci-flaky.yaml)
- [ci-pulsarbot.yaml](https://github.com/apache/pulsar/tree/master/.github/workflows/ci-pulsarbot.yaml)
- [ci-documentbot.yml](https://github.com/apache/pulsar/tree/master/.github/workflows/ci-documentbot.yml)
- [ci-go-functions.yaml](https://github.com/apache/pulsar/tree/master/.github/workflows/ci-go-functions.yaml)
- [ci-maven-cache-update.yaml](https://github.com/apache/pulsar/tree/master/.github/workflows/ci-maven-cache-update.yaml)

## Github Actions

These are actions that are used in the workflows above. All other actions in this repository are not actively used.

### Custom Actions

- [docbot](docbot/README.md)
- [pulsarbot](pulsarbot/README.md)

### Forked GitHub Actions

- [gh-actions-artifact-client](gh-actions-artifact-client/README.md) forked from [lhotari/gh-actions-artifact-client](https://github.com/lhotari/gh-actions-artifact-client)
- [paths-filter](paths-filter/README.md) forked from [dorny/paths-filter](https://github.com/dorny/paths-filter)
- [action-junit-report](action-junit-report/README.md) forked from [mikepenz/action-junit-report](https://github.com/mikepenz/action-junit-report)
