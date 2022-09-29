package check

import (
	"context"
	"os"
	"testing"

	"github.com/sethvargo/go-githubactions"

	"github.com/google/go-github/v45/github"
	"github.com/migueleliasweb/go-github-mock/src/mock"
)

func mustNewActionConfig() *Config {
	_ = os.Setenv("GITHUB_REPOSITORY", "mangoGoForward/C")
	_ = os.Setenv("INPUT_TYPES", "feat\n            improve\n            fix\n            cleanup\n            refactor\n            revert")
	_ = os.Setenv("INPUT_SCOPES", "admin\n            broker\n            cli\n            io\n            fn\n            meta\n            monitor\n            proxy\n            schema\n            sec\n            sql\n            storage\n            offload\n            txn\n            java\n            cpp\n            py\n            ws\n            test\n            ci\n            build\n            misc\n            doc\n            blog\n            site")
	_ = os.Setenv("INPUT_HEADERPATTERN", "^(?:\\[(\\w+)\\])?(?:\\[(\\w+)\\])? (.+)$")

	githubAction := githubactions.New()
	config, err := NewActionConfig(githubAction)
	if err != nil {
		panic(err)
	}

	return config
}

func mustNewActionWithDefaultConfig() *Config {
	_ = os.Setenv("GITHUB_REPOSITORY", "mangoGoForward/C")

	githubAction := githubactions.New()
	config, err := NewActionConfig(githubAction)
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

func TestTitleMatched(t *testing.T) {
	id := int64(1)
	title := "[feat][ci] Support to check pr title"

	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID:     &id,
				Title:  &title,
				Labels: nil,
			},
		),
	)

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(int(id), openedActionType)
	if err != nil {
		t.Fatal(err)
	}
}

func TestTypeOfTitleUnMatched(t *testing.T) {
	id := int64(1)
	title := "[rewrite][ci] Support to check pr title"

	userLogin := "mango"
	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID: &id,
				User: &github.User{
					Login: &userLogin,
				},
				Title:  &title,
				Labels: nil,
			},
		),
		mock.WithRequestMatch(mock.PostReposIssuesCommentsByOwnerByRepoByIssueNumber, nil),
	)

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(int(id), openedActionType)
	assertMessageLabel(t, err, TitleUnmatchPattern)
}

func TestScopeOfTitleUnMatched(t *testing.T) {
	id := int64(1)
	title := "[feat][ci1] Support to check pr title"

	userLogin := "mango"
	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID: &id,
				User: &github.User{
					Login: &userLogin,
				},
				Title:  &title,
				Labels: nil,
			},
		),
		mock.WithRequestMatch(mock.PostReposIssuesCommentsByOwnerByRepoByIssueNumber, nil),
	)

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(int(id), openedActionType)
	assertMessageLabel(t, err, TitleUnmatchPattern)
}

func TestEmptyTypeOfTitleUnMatched(t *testing.T) {
	id := int64(1)
	title := "[][ci1] Support to check pr title"

	userLogin := "mango"
	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID: &id,
				User: &github.User{
					Login: &userLogin,
				},
				Title:  &title,
				Labels: nil,
			},
		),
		mock.WithRequestMatch(mock.PostReposIssuesCommentsByOwnerByRepoByIssueNumber, nil),
	)

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(int(id), openedActionType)
	assertMessageLabel(t, err, TitleUnmatchPattern)
}

func TestEmptyScopeOfTitleUnMatched(t *testing.T) {
	id := int64(1)
	title := "[feat][] Support to check pr title"

	userLogin := "mango"
	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID: &id,
				User: &github.User{
					Login: &userLogin,
				},
				Title:  &title,
				Labels: nil,
			},
		),
		mock.WithRequestMatch(mock.PostReposIssuesCommentsByOwnerByRepoByIssueNumber, nil),
	)

	config := mustNewActionConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(int(id), openedActionType)
	assertMessageLabel(t, err, TitleUnmatchPattern)
}

func TestTitleMatchedWithDefaultConfig(t *testing.T) {
	id := int64(1)
	title := "[feat][ci] Support to check pr title"

	mockedHTTPClient := mock.NewMockedHTTPClient(
		mock.WithRequestMatch(
			mock.GetReposPullsByOwnerByRepoByPullNumber,
			github.PullRequest{
				ID:     &id,
				Title:  &title,
				Labels: nil,
			},
		),
	)

	config := mustNewActionWithDefaultConfig()
	action := NewActionWithClient(context.Background(), config, github.NewClient(mockedHTTPClient))

	err := action.Run(int(id), openedActionType)
	if err != nil {
		t.Fatal(err)
	}
}
