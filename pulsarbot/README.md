# Pulsar Bot

`pulsarbot` is a github action that reacts to comments and trigger coresponding tasks.

All pulsarbot commands start with `/pulsarbot`.

The accepted commands are:

- `/pulsarbot run-failure-checks`: Run all the failed checks.
- `/pulsarbot rerun-failure-checks`: Rerun all the failed checks. Same as `/pulsarbot run-failure-checks`.
- `/pulsarbot run <check-name>`: Run a specified check only if the check is failed.
- `/pulsarbot rerun <check-name>`: Same as `/pulsarbot run <check-name>`


### Testing changes to `entrypoint.sh` script

You can test modifications to the `entrypoint.sh` script locally with the `test_pulsarbot.sh` script.

Syntax for testing changes
```bash
GITHUB_TOKEN=your_token_here ./test_pulsarbot.sh PR_NUMBER_HERE
```
