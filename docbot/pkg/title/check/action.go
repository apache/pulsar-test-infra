package check

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"regexp"

	"github.com/apache/pulsar-test-infra/docbot/pkg/logger"
	"github.com/google/go-github/v45/github"
	"golang.org/x/oauth2"
)

const (
	TitleUnmatchPattern = `Please follow the [Pulsar Pull Request Naming Convention Guide](https://docs.google.com/document/d/1d8Pw6ZbWk-_pCKdOmdvx9rnhPiyuxwq60_TrD68d7BA/edit#bookmark=id.y8943h392zno) to write your PR title.`

	openedActionType = "opened"
	editedActionType = "edited"
)

type Action struct {
	config *Config

	globalContext context.Context
	client        *github.Client

	prNumber int
}

func NewAction(ctx context.Context, ac *Config) *Action {
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: ac.GetToken()},
	)

	tc := oauth2.NewClient(ctx, ts)

	return &Action{
		config:        ac,
		globalContext: ctx,
		client:        github.NewClient(tc),
	}
}

func NewActionWithClient(ctx context.Context, ac *Config, client *github.Client) *Action {
	return &Action{
		config:        ac,
		globalContext: ctx,
		client:        client,
	}
}

func (a *Action) Run(prNumber int, actionType string) error {
	a.prNumber = prNumber

	switch actionType {
	case openedActionType, editedActionType:
		return a.checkPRTitle()
	}
	return nil
}

func (a *Action) checkPRTitle() error {
	pr, _, err := a.client.PullRequests.Get(a.globalContext, a.config.GetOwner(), a.config.GetRepo(), a.prNumber)
	if err != nil {
		return fmt.Errorf("get PR: %v", err)
	}
	title := pr.Title
	logger.Infof("The PR's title: %v\n", *title)

	re := regexp.MustCompile(a.config.GetHeaderPattern())
	matched := re.FindSubmatch([]byte(*title))
	titleInvalid := true
	if len(matched) == 4 {
		titleType := bytes.NewBuffer(matched[1]).String()
		titleScope := bytes.NewBuffer(matched[2]).String()

		if existInArr(titleType, a.config.GetTypes()) && existInArr(titleScope, a.config.GetScopes()) {
			titleInvalid = false
		}
	}

	if titleInvalid {
		err = a.createComment(fmt.Sprintf("@%s %s", pr.User.GetLogin(), TitleUnmatchPattern))
		if err != nil {
			logger.Errorf("Failed to create %s comment: %v", TitleUnmatchPattern, err)
			return err
		}
		return errors.New(TitleUnmatchPattern)
	} else {
		return nil
	}
}

func (a *Action) createComment(body string) error {
	_, _, err := a.client.Issues.CreateComment(a.globalContext, a.config.GetOwner(), a.config.GetRepo(),
		a.prNumber, &github.IssueComment{Body: func(v string) *string { return &v }(body)})
	return err
}

func existInArr(target string, origin []string) bool {
	titleMatched := false
	for _, val := range origin {
		if target == val {
			titleMatched = true
			break
		}
	}
	return titleMatched
}
