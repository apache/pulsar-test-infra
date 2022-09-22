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
  check-pr-title:
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

      - name: Check PR title
        uses: ./check-pr-title
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

## Event triggers

There are two events that can be used as triggers for this action, each with different characteristics:

1. [`pull_request_target`](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#pull_request_target): This allows the action to be used in a fork-based workflow, where e.g. you want to accept pull requests in a public repository. In this case, the configuration from the main branch of your repository will be used for the check. This means that you need to have this configuration in the main branch for the action to run at all (e.g. it won't run within a PR that adds the action initially). Also if you change the configuration in a PR, the changes will not be reflected for the current PR – only subsequent ones after the changes are in the main branch.
2. [`pull_request`](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#pull_request): This configuration uses the latest configuration that is available in the current branch. It will only work if the branch is based in the repository itself. If this configuration is used and a pull request from a fork is opened, you'll encounter an error as the GitHub token environment parameter is not available. This option is viable if all contributors have write access to the repository.
