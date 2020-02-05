# Pulsar Bot

`pulsarbot` is a github action that reacts to comments and trigger coresponding tasks.

All pulsarbot commands start with `/pulsarbot`.

The accepted commands are:

- `/pulsarbot run-failure-checks`: Run all the failed checks.
- `/pulsarbot rerun-failure-checks`: Rerun all the failed checks. Same as `/pulsarbot run-failure-checks`.
- `/pulsarbot run <check-name>`: Run a specified check only if the check is failed.
- `/pulsarbot rerun <check-name>`: Same as `/pulsarbot run <check-name>`