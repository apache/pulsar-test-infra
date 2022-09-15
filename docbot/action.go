package main

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/apache/pulsar-test-infra/docbot/pkg/logger"
	"github.com/google/go-github/v45/github"
	"golang.org/x/oauth2"
)

const (
	MessageLabelMultiple = "Please select only one documentation label in your PR description."

	openedActionType    = "opened"
	editedActionType    = "edited"
	labeledActionType   = "labeled"
	unlabeledActionType = "unlabeled"
)

var builtInDescriptions = make(map[string]string)

func init() {
	builtInDescriptions["doc-required"] = "Your PR changes impact docs and you will update later"
	builtInDescriptions["doc-not-needed"] = "Your PR changes do not impact docs"
	builtInDescriptions["doc"] = "Your PR contains doc changes"
	builtInDescriptions["doc-complete"] = "Docs have been already added"
}

type Action struct {
	config *ActionConfig

	globalContext context.Context
	client        *github.Client

	prNumber int
}

func NewAction(ac *ActionConfig) *Action {
	ctx := context.Background()
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: ac.GetToken()},
	)

	tc := oauth2.NewClient(ctx, ts)

	return NewActionWithClient(ctx, ac, github.NewClient(tc))
}

func NewActionWithClient(ctx context.Context, ac *ActionConfig, client *github.Client) *Action {
	return &Action{
		config:        ac,
		globalContext: ctx,
		client:        client,
	}
}

func (a *Action) Run(prNumber int, actionType string) error {
	a.prNumber = prNumber

	switch actionType {
	case openedActionType, editedActionType, labeledActionType, unlabeledActionType:
		return a.checkLabels()
	}
	return nil
}

func (a *Action) checkLabels() error {
	pr, _, err := a.client.PullRequests.Get(a.globalContext, a.config.GetOwner(), a.config.GetRepo(), a.prNumber)
	if err != nil {
		return fmt.Errorf("get PR: %v", err)
	}

	var bodyLabels map[string]bool
	if pr.Body != nil {
		bodyLabels = a.extractLabels(*pr.Body)
	}

	logger.Infof("PR description: %v\n", *pr.Body)

	logger.Infoln("@List repo labels")
	repoLabels, err := a.getRepoLabels()
	if err != nil {
		return fmt.Errorf("list repo labels: %v", err)
	}
	logger.Infof("Repo labels: %v\n", repoLabels)

	prLabels := a.labelsToMap(pr.Labels)
	logger.Infof("PR labels: %v\n", prLabels)

	// Get expected labels
	// Only handle labels already exist in repo
	expectedLabelsMap := make(map[string]bool)
	checkedCount := 0
	for label, checked := range bodyLabels {
		if _, exist := repoLabels[label]; !exist {
			logger.Infof("Found label %v not exist int repo\n", label)
			continue
		}
		expectedLabelsMap[label] = checked
		if checked {
			checkedCount++
		}
	}
	logger.Infof("Expected labels: %v\n", expectedLabelsMap)

	labelsToRemove := make(map[string]struct{}, 0)
	labelsToAdd := make(map[string]struct{}, 0)

	if checkedCount == 0 {
		logger.Infoln("Label missing")
		for label := range a.config.labelWatchSet {
			_, found := prLabels[label]
			if found {
				labelsToRemove[label] = struct{}{}
			}
		}
		_, found := prLabels[a.config.GetLabelMissing()]
		if !found {
			labelsToAdd[a.config.GetLabelMissing()] = struct{}{}
		} else {
			logger.Infoln("Already added missing label.")
			return errors.New(a.getLabelMissingMessage())
		}
	} else {
		if !a.config.GetEnableLabelMultiple() && checkedCount > 1 {
			logger.Infoln("Multiple labels not enabled")
			err = a.addAndCleanupHelpComment(pr.User.GetLogin(), MessageLabelMultiple)
			if err != nil {
				return err
			}
			return errors.New(MessageLabelMultiple)
		}

		_, found := prLabels[a.config.GetLabelMissing()]
		if found {
			labelsToRemove[a.config.GetLabelMissing()] = struct{}{}
		}

		for label, checked := range expectedLabelsMap {
			if _, found := prLabels[label]; found && !checked {
				labelsToRemove[label] = struct{}{}
			} else if !found && checked {
				labelsToAdd[label] = struct{}{}
			}
		}
	}

	if len(labelsToAdd) == 0 {
		logger.Infoln("No labels to add.")
	} else {
		labels := a.labelsSetToString(labelsToAdd)
		logger.Infof("Labels to add: %v\n", labels)
		err = a.addLabels(labels)
		if err != nil {
			logger.Errorf("Failed add labels %v: %v\n", labelsToAdd, err)
			return err
		}
	}

	if len(labelsToRemove) == 0 {
		logger.Infoln("No labels to remove.")
	} else {
		labels := a.labelsSetToString(labelsToRemove)
		logger.Infof("Labels to remove: %v\n", labels)
		for _, label := range labels {
			err = a.removeLabel(label)
			if err != nil {
				logger.Errorf("Failed remove labels %v: %v\n", labelsToRemove, err)
				return err
			}
		}
	}

	if checkedCount == 0 {
		err := a.addAndCleanupHelpComment(pr.User.GetLogin(), a.getLabelMissingMessage())
		if err != nil {
			return err
		}
		return errors.New(a.getLabelMissingMessage())
	}

	return nil
}

func (a *Action) extractLabels(prBody string) map[string]bool {
	r := regexp.MustCompile(a.config.GetLabelPattern())
	targets := r.FindAllStringSubmatch(prBody, -1)

	labels := make(map[string]bool)
	for _, v := range targets {
		checked := strings.ToLower(strings.TrimSpace(v[1])) == "x"
		name := strings.TrimSpace(v[2])

		// Filter uninterested labels
		if _, exist := a.config.labelWatchSet[name]; !exist {
			continue
		}

		labels[name] = checked
	}

	return labels
}

func (a *Action) getRepoLabels() (map[string]struct{}, error) {
	ctx := context.Background()
	listOptions := &github.ListOptions{PerPage: 100}
	repoLabels := make(map[string]struct{}, 0)
	for {
		rLabels, resp, err := a.client.Issues.ListLabels(ctx, a.config.GetOwner(), a.config.GetRepo(), listOptions)
		if err != nil {
			return nil, err
		}

		for _, label := range rLabels {
			repoLabels[label.GetName()] = struct{}{}
		}
		if resp.NextPage == 0 {
			break
		}
		listOptions.Page = resp.NextPage
	}
	return repoLabels, nil
}

func (a *Action) labelsToMap(labels []*github.Label) map[string]struct{} {
	result := make(map[string]struct{}, 0)
	for _, label := range labels {
		result[label.GetName()] = struct{}{}
	}
	return result
}

func (a *Action) labelsSetToString(labels map[string]struct{}) []string {
	result := []string{}
	for label := range labels {
		result = append(result, label)
	}
	return result
}

func (a *Action) getLabelInvalidCommentIDs(body string) ([]int64, error) {
	ctx := context.Background()
	listOptions := &github.IssueListCommentsOptions{}
	listOptions.PerPage = 100
	commentIDs := make([]int64, 0)
	for {
		comments, resp, err := a.client.Issues.ListComments(ctx, a.config.GetOwner(), a.config.GetRepo(),
			a.prNumber, listOptions)
		if err != nil {
			return nil, err
		}
		for _, item := range comments {
			if strings.Contains(*item.Body, body) {
				commentIDs = append(commentIDs, *item.ID)
			}
		}

		if resp.NextPage == 0 {
			break
		}
		listOptions.Page = resp.NextPage
	}

	return commentIDs, nil
}

func (a *Action) createComment(body string) error {
	_, _, err := a.client.Issues.CreateComment(a.globalContext, a.config.GetOwner(), a.config.GetRepo(),
		a.prNumber, &github.IssueComment{Body: func(v string) *string { return &v }(body)})
	return err
}

func (a *Action) deleteComment(commentID int64) error {
	_, err := a.client.Issues.DeleteComment(a.globalContext, a.config.GetOwner(), a.config.GetRepo(),
		commentID)
	return err
}

func (a *Action) addLabels(labels []string) error {
	_, _, err := a.client.Issues.AddLabelsToIssue(a.globalContext, a.config.GetOwner(), a.config.GetRepo(),
		a.prNumber, labels)
	return err
}

func (a *Action) removeLabel(label string) error {
	_, err := a.client.Issues.RemoveLabelForIssue(a.globalContext, a.config.GetOwner(), a.config.GetRepo(),
		a.prNumber, label)
	return err
}

// addAndCleanupHelpComment adds a help comment when no help comment on the PR.
func (a *Action) addAndCleanupHelpComment(login, body string) error {
	commentIDs, err := a.getLabelInvalidCommentIDs(body)
	if err != nil {
		logger.Errorf("Failed to get the comment list: %v", err)
		return err
	}
	if len(commentIDs) == 0 {
		err = a.createComment(fmt.Sprintf("@%s %s", login, body))
		if err != nil {
			logger.Errorf("Failed to create %s comment: %v", body, err)
			return err
		}
		return nil
	} else {
		// cleanup
		if len(commentIDs) > 1 {
			for index, id := range commentIDs {
				if index == 0 {
					continue
				}
				err := a.deleteComment(id)
				if err != nil {
					logger.Errorf("Failed to delete %v comment: %v", id, err)
					return err
				}
			}
		}
	}

	return nil
}

func (a *Action) getLabelMissingMessage() string {
	msg := "Please add the following content to your PR description and select a checkbox:\n```\n"

	for _, label := range a.config.labelWatchList {
		desc := ""
		if value, found := builtInDescriptions[label]; found {
			desc = fmt.Sprintf("<!-- %s -->", value)
		}
		msg += fmt.Sprintf("- [ ] `%s` %s\n", label, desc)
	}

	msg += "```"

	return msg
}
