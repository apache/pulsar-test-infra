package main

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/google/go-github/v45/github"
	"github.com/migueleliasweb/go-github-mock/src/mock"
)

func repoLabels() []*github.Label {
	labels := []string{"doc-required", "doc-not-needed", "doc", "doc-complete", "doc-label-missing"}

	result := make([]*github.Label, 0)
	for _, label := range labels {
		name := label
		result = append(result, &github.Label{Name: &name})
	}

	return result
}

func mustNewActionConfig() *ActionConfig {
	_ = os.Setenv("GITHUB_REPOSITORY", "apache/pulsar")
	_ = os.Setenv("LABEL_WATCH_LIST", "doc,doc-required,doc-not-needed,doc-complete")
	_ = os.Setenv("LABEL_MISSING", "doc-label-missing")

	config, err := NewActionConfig()
	if err != nil {
		panic(err)
	}

	return config
}

func assertMessageLabel(t *testing.T, err error, message string) {
	t.Helper()

	if err == nil {
		t.Fatal("Expect err not nil")
	}

	if err.Error() != message {
		t.Fatal("Expect err equals " + message)
	}
}

func TestSingleChecked(t *testing.T) {
	id := int64(1)
	body := fmt.Sprintf(`
Check the box below or label this PR directly.

Need to update docs?

- [ ] %s
(Your PR needs to update docs and you will update later)

- [x] %s
(Please explain why)

- [ ] %s
(Your PR contains doc changes)

- [ ] %s
(Docs have been already added)
`, "`doc-required`", "`doc-not-needed`", "`doc`", "`doc-complete`")

	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID:     &id,
				Body:   &body,
				Labels: nil,
			},
		), mock.WithRequestMatch(
			mock.GetReposLabelsByOwnerByRepo,
			repoLabels(),
		),
		mock.WithRequestMatch(mock.PostReposIssuesLabelsByOwnerByRepoByIssueNumber, nil),
	)

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(1, openedActionType)
	if err != nil {
		t.Fatal(err)
	}
}

func TestMultipleChecked(t *testing.T) {
	id := int64(1)
	body := fmt.Sprintf(`
Check the box below or label this PR directly.

Need to update docs?

- [ ] %s
(Your PR needs to update docs and you will update later)

- [x] %s
(Please explain why)

- [x] %s
(Your PR contains doc changes)

- [ ] %s
(Docs have been already added)
`, "`doc-required`", "`doc-not-needed`", "`doc`", "`doc-complete`")

	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID:     &id,
				Body:   &body,
				Labels: nil,
			},
		), mock.WithRequestMatch(
			mock.GetReposLabelsByOwnerByRepo,
			repoLabels(),
		),
		mock.WithRequestMatch(mock.PostReposIssuesLabelsByOwnerByRepoByIssueNumber, nil),
	)

	const key = "ENABLE_LABEL_MULTIPLE"
	value := os.Getenv(key)
	defer func() {
		// reset
		_ = os.Setenv(key, value)
	}()
	_ = os.Setenv("ENABLE_LABEL_MULTIPLE", "true")

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(1, openedActionType)
	if err != nil {
		t.Fatal(err)
	}
}

func TestUnchecked(t *testing.T) {
	id := int64(1)
	body := fmt.Sprintf(`
Check the box below or label this PR directly.

Need to update docs?

- [ ] %s
(Your PR needs to update docs and you will update later)

- [ ] %s
(Please explain why)

- [ ] %s
(Your PR contains doc changes)

- [ ] %s
(Docs have been already added)
`, "`doc-required`", "`doc-not-needed`", "`doc`", "`doc-complete`")

	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID:     &id,
				Body:   &body,
				Labels: nil,
			},
		), mock.WithRequestMatch(
			mock.GetReposLabelsByOwnerByRepo,
			repoLabels(),
		),
		mock.WithRequestMatch(mock.PostReposIssuesLabelsByOwnerByRepoByIssueNumber, nil),
		mock.WithRequestMatch(mock.GetReposIssuesCommentsByOwnerByRepoByIssueNumber, nil),
		mock.WithRequestMatch(mock.PostReposIssuesCommentsByOwnerByRepoByIssueNumber, nil),
	)

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(1, openedActionType)
	assertMessageLabel(t, err, action.getLabelMissingMessage())
}

func TestMultipleChecked_WhenMultipleLabelsNotEnabled(t *testing.T) {
	id := int64(1)
	body := fmt.Sprintf(`
Check the box below or label this PR directly.

Need to update docs?

- [ ] %s
(Your PR needs to update docs and you will update later)

- [x] %s
(Please explain why)

- [x] %s
(Your PR contains doc changes)

- [ ] %s
(Docs have been already added)
`, "`doc-required`", "`doc-not-needed`", "`doc`", "`doc-complete`")

	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID:     &id,
				Body:   &body,
				Labels: nil,
			},
		), mock.WithRequestMatch(
			mock.GetReposLabelsByOwnerByRepo,
			repoLabels(),
		),
		mock.WithRequestMatch(mock.PostReposIssuesLabelsByOwnerByRepoByIssueNumber, nil),
		mock.WithRequestMatch(mock.GetReposIssuesCommentsByOwnerByRepoByIssueNumber, nil),
		mock.WithRequestMatch(mock.PostReposIssuesCommentsByOwnerByRepoByIssueNumber, nil),
	)

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(1, openedActionType)
	assertMessageLabel(t, err, MessageLabelMultiple)
}

func TestSingleChecked_WhenLabelMissingExist(t *testing.T) {
	id := int64(1)
	body := fmt.Sprintf(`
Check the box below or label this PR directly.

Need to update docs?

- [ ] %s
(Your PR needs to update docs and you will update later)

- [x] %s
(Please explain why)

- [ ] %s
(Your PR contains doc changes)

- [ ] %s
(Docs have been already added)
`, "`doc-required`", "`doc-not-needed`", "`doc`", "`doc-complete`")

	labelMissing := "doc-label-missing"
	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID:     &id,
				Body:   &body,
				Labels: []*github.Label{{Name: &labelMissing}},
			},
		), mock.WithRequestMatch(
			mock.GetReposLabelsByOwnerByRepo,
			repoLabels(),
		),
		mock.WithRequestMatch(mock.PostReposIssuesLabelsByOwnerByRepoByIssueNumber, nil),
		mock.WithRequestMatch(mock.DeleteReposIssuesLabelsByOwnerByRepoByIssueNumberByName, nil),
	)

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(1, openedActionType)
	if err != nil {
		t.Fatal(err)
	}
}

func TestUnchecked_WhenLabelMissingExist(t *testing.T) {
	id := int64(1)
	body := fmt.Sprintf(`
Check the box below or label this PR directly.

Need to update docs?

- [ ] %s
(Your PR needs to update docs and you will update later)

- [ ] %s
(Please explain why)

- [ ] %s
(Your PR contains doc changes)

- [ ] %s
(Docs have been already added)
`, "`doc-required`", "`doc-not-needed`", "`doc`", "`doc-complete`")

	labelMissing := "doc-label-missing"
	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID:     &id,
				Body:   &body,
				Labels: []*github.Label{{Name: &labelMissing}},
			},
		), mock.WithRequestMatch(
			mock.GetReposLabelsByOwnerByRepo,
			repoLabels(),
		),
	)

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(1, openedActionType)
	assertMessageLabel(t, err, action.getLabelMissingMessage())
}

func TestSingleChecked_WhenDocLabelExists(t *testing.T) {
	id := int64(1)
	body := fmt.Sprintf(`
Check the box below or label this PR directly.

Need to update docs?

- [ ] %s
(Your PR needs to update docs and you will update later)

- [x] %s
(Please explain why)

- [ ] %s
(Your PR contains doc changes)

- [ ] %s
(Docs have been already added)
`, "`doc-required`", "`doc-not-needed`", "`doc`", "`doc-complete`")

	docLabel := "doc"
	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID:     &id,
				Body:   &body,
				Labels: []*github.Label{{Name: &docLabel}},
			},
		), mock.WithRequestMatch(
			mock.GetReposLabelsByOwnerByRepo,
			repoLabels(),
		),
		mock.WithRequestMatch(mock.PostReposIssuesLabelsByOwnerByRepoByIssueNumber, nil),
		mock.WithRequestMatch(mock.DeleteReposIssuesLabelsByOwnerByRepoByIssueNumberByName, nil),
	)
	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(1, openedActionType)
	if err != nil {
		t.Fatal(err)
	}
}
