# Documentation Bot 

Automatically label pull requests based on the checked task list.

## Usage

Create a workflow `.github/workflows/ci-documentbot.yml` with below content:

```yaml
name: Documentation Bot

on:
  pull_request_target:
    types:
      - opened
      - edited
      - labeled
      - unlabeled

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  label:
    if: ${{ github.repository == 'apache/pulsar' }}
    permissions:
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
      - name: Checkout action
        uses: actions/checkout@v3
        with:
          repository: apache/pulsar-test-infra
          ref: master

      - name: Set up Go
        uses: actions/setup-go@v3
        with:
          go-version: 1.18

      - name: Labeling
        uses: ./docbot label
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          LABEL_WATCH_LIST: 'doc,doc-required,doc-not-needed,doc-complete'
          LABEL_MISSING: 'doc-label-missing'
```

## Configurations

| Name                    | Description                            | Default                   |
|-------------------------|----------------------------------------|---------------------------|
| `GITHUB_TOKEN`          | The GitHub Token                       | &nbsp;                    |
| `LABEL_PATTERN`         | RegExp to extract labels               | `'- \[(.*?)\] ?`(.+?)`' ` |
| `LABEL_WATCH_LIST`      | Label names to watch, separated by `,` | &nbsp;                    |
| `ENABLE_LABEL_MISSING`  | Add a label missing if none selected   | `true`                    |
| `LABEL_MISSING`         | The label mssing name                  | `label-missing`           |
| `ENABLE_LABEL_MULTIPLE` | Allow multiple labels selected         | `false`                   |


# action-check-pr-title
This is a [GitHub Action](https://github.com/features/actions) that ensures your PR title matches the Conventional Commits spec.

The typical use case is to use this in combination with a tool like semantic-release to automate releases.

## Installation

1. [Add the action](https://docs.github.com/en/actions/quickstart) with the following configuration
```yml
name: "Check PR title"

on:
  pull_request_target:
    types:
      - opened
      - edited

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  label:
    if: ${{ github.repository == 'apache/pulsar' }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout action
        uses: actions/checkout@v3
        with:
          repository: apache/pulsar-test-infra
          ref: master

      - name: Set up Go
        uses: actions/setup-go@v3
        with:
          go-version: 1.18

      - name: Labeling
        uses: ./docbot title check
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Configuration

The action works without configuration, however you can provide options for customization.

The following terminology helps to understand the configuration options:

```
[feat][ui] Add `Button` component.
^      ^   ^
|      |   |__ Subject
|      |_______ Scope
|____________ Type
```

```yml
        with:
          # Configure which types are allowed.
          types: |
            fix
            feat
          # Configure which scopes are allowed.
          scopes: |
            core
            ui
          # If you're using a format for the PR title that differs from the traditional Conventional
          # Commits spec, you can use these options to customize the parsing of the type, scope and
          # subject. The `headerPattern` should contain a regex where the capturing groups in parentheses
          # correspond to the parts listed in `headerPatternCorrespondence`.
          # See: https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-commits-parser#headerpattern
          headerPattern: '^(?:\[(\w+)\])?(?:\[(\w+)\])? (.+)$'
```

