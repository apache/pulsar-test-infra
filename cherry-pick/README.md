# Cherry-pick for Github Action

This action used for cherry-picking the PRs automatically.

When you close a PR then the bot will prompt you:

```bash
Hey. If you want to cherry-pick this pr to a target branch, please comments '/pulsarbot cherry-pick to branch-x.y'.
```

Then you can comment `'/pulsarbot cherry-pick to branch-x.y'`, and the bot will create a new PR to merge it into the target branch.
