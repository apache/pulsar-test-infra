# Diff Only Filter for GitHub Actions

This action includes a filter to check if only certain files or directories are changed in a range of commits.

If only the provided files and directories are changed, the action will set `changed_only` to `yes`.
Otherwise, `changed_only` is set to `false`.

## Examples

```
      - name: Check if this pull request only changes documentation
        id:   docs
        uses: apache/pulsar-test-infra/diff-only@master
        with:
          args: site2

      - name: Set up JDK 1.8
        uses: actions/setup-java@v1
        # skip this step if this pull request only changes documentation
        if: steps.docs.outputs.changed_only == 'no'
        with:
          java-version: 1.8
```
