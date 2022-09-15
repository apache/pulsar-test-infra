package main

import (
	"fmt"
	"os"
	"strings"
)

type ActionConfig struct {
	token *string
	repo  *string
	owner *string

	labelPattern        *string
	labelWatchSet       map[string]struct{}
	labelWatchList      []string
	labelMissing        *string
	enableLabelMissing  *bool
	enableLabelMultiple *bool
}

func NewActionConfig() (*ActionConfig, error) {
	ownerRepoSlug := os.Getenv("GITHUB_REPOSITORY")
	ownerRepo := strings.Split(ownerRepoSlug, "/")
	if len(ownerRepo) != 2 {
		return nil, fmt.Errorf("GITHUB_REPOSITORY is not found")
	}
	owner, repo := ownerRepo[0], ownerRepo[1]

	token := os.Getenv("GITHUB_TOKEN")

	labelPattern := os.Getenv("LABEL_PATTERN")
	if len(labelPattern) == 0 {
		labelPattern = "- \\[(.*?)\\] ?`(.+?)`"
	}

	labelWatchListSlug := os.Getenv("LABEL_WATCH_LIST")
	labelWatchSet := make(map[string]struct{})
	labelWatchList := make([]string, 0)
	for _, l := range strings.Split(labelWatchListSlug, ",") {
		key := strings.TrimSpace(l)
		if key == "" {
			continue
		}
		_, found := labelWatchSet[key]
		if !found {
			labelWatchSet[key] = struct{}{}
			labelWatchList = append(labelWatchList, key)
		}
	}

	enableLabelMissingSlug := os.Getenv("ENABLE_LABEL_MISSING")
	enableLabelMissing := true
	if enableLabelMissingSlug == "false" {
		enableLabelMissing = false
	}

	labelMissing := os.Getenv("LABEL_MISSING")
	if len(labelMissing) == 0 {
		labelMissing = "label-missing"
	}

	enableLabelMultipleSlug := os.Getenv("ENABLE_LABEL_MULTIPLE")
	enableLabelMultiple := false
	if enableLabelMultipleSlug == "true" {
		enableLabelMultiple = true
	}

	return &ActionConfig{
		token:               &token,
		repo:                &repo,
		owner:               &owner,
		labelPattern:        &labelPattern,
		labelWatchSet:       labelWatchSet,
		labelWatchList:      labelWatchList,
		labelMissing:        &labelMissing,
		enableLabelMissing:  &enableLabelMissing,
		enableLabelMultiple: &enableLabelMultiple,
	}, nil
}

func (ac *ActionConfig) GetToken() string {
	if ac == nil || ac.token == nil {
		return ""
	}
	return *ac.token
}

func (ac *ActionConfig) GetOwner() string {
	if ac == nil || ac.owner == nil {
		return ""
	}
	return *ac.owner
}

func (ac *ActionConfig) GetRepo() string {
	if ac == nil || ac.repo == nil {
		return ""
	}
	return *ac.repo
}

func (ac *ActionConfig) GetLabelPattern() string {
	if ac == nil || ac.labelPattern == nil {
		return ""
	}
	return *ac.labelPattern
}

func (ac *ActionConfig) GetLabelMissing() string {
	if ac == nil || ac.labelMissing == nil {
		return ""
	}
	return *ac.labelMissing
}

func (ac *ActionConfig) GetEnableLabelMissing() bool {
	if ac == nil || ac.enableLabelMissing == nil {
		return false
	}
	return *ac.enableLabelMissing
}

func (ac *ActionConfig) GetEnableLabelMultiple() bool {
	if ac == nil || ac.enableLabelMultiple == nil {
		return false
	}
	return *ac.enableLabelMultiple
}
