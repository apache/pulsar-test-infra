package check

import (
	"fmt"
	"os"
	"strings"

	"github.com/sethvargo/go-githubactions"
)

type Config struct {
	token *string
	repo  *string
	owner *string

	types         *[]string
	scopes        *[]string
	headerPattern *string
}

var defaultTypes = [6]string{"feat", "improve", "fix", "cleanup", "refactor", "revert"}
var defaultScopes = [...]string{"admin", "broker", "cli", "io", "fn", "meta", "monitor", "proxy", "schema", "sec",
	"sql", "storage", "offload", "txn", "java", "cpp", "py", "ws", "test", "ci", "build",
	"misc", "doc", "blog", "site"}
var defaultHeaderPattern = "^(?:\\[(\\w+)\\])?(?:\\[(\\w+)\\])? (.+)$"

func NewActionConfig(action *githubactions.Action) (*Config, error) {
	ownerRepoSlug := os.Getenv("GITHUB_REPOSITORY")
	ownerRepo := strings.Split(ownerRepoSlug, "/")
	if len(ownerRepo) != 2 {
		return nil, fmt.Errorf("GITHUB_REPOSITORY is not found")
	}
	owner, repo := ownerRepo[0], ownerRepo[1]

	token := os.Getenv("GITHUB_TOKEN")

	types := strings.Fields(strings.TrimSpace(action.GetInput("types")))
	if len(types) == 0 {
		types = defaultTypes[:]
	}
	scopes := strings.Fields(strings.TrimSpace(action.GetInput("scopes")))
	if len(scopes) == 0 {
		scopes = defaultScopes[:]
	}
	headerPattern := action.GetInput("headerPattern")
	if len(headerPattern) == 0 {
		headerPattern = defaultHeaderPattern
	}

	return &Config{
		token:         &token,
		repo:          &repo,
		owner:         &owner,
		types:         &types,
		scopes:        &scopes,
		headerPattern: &headerPattern,
	}, nil
}

func (ac *Config) GetOwner() string {
	if ac == nil || ac.owner == nil {
		return ""
	}
	return *ac.owner
}

func (ac *Config) GetRepo() string {
	if ac == nil || ac.repo == nil {
		return ""
	}
	return *ac.repo
}

func (ac *Config) GetToken() string {
	if ac == nil || ac.token == nil {
		return ""
	}
	return *ac.token
}

func (ac *Config) GetTypes() []string {
	if ac == nil || ac.types == nil {
		return nil
	}
	return *ac.types
}

func (ac *Config) GetScopes() []string {
	if ac == nil || ac.scopes == nil {
		return nil
	}
	return *ac.scopes
}

func (ac *Config) GetHeaderPattern() string {
	if ac == nil || ac.headerPattern == nil {
		return ""
	}
	return *ac.headerPattern
}
