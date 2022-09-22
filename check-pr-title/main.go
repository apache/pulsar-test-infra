package main

import (
	"context"
	orgAction "github.com/apache/pulsar-test-infra/check-pr-title/pkg/action"
	"github.com/apache/pulsar-test-infra/docbot/pkg/logger"
	"github.com/sethvargo/go-githubactions"
)

func main() {
	logger.Infoln("@Start check PR title helper")

	githubAction := githubactions.New()
	cfg, err := orgAction.NewActionConfig(githubAction)
	if err != nil {
		logger.Fatalf("Get action config: %v\n", err)
	}

	ctx := context.Background()
	action := orgAction.NewAction(ctx, cfg)

	githubContext, err := githubactions.Context()
	if err != nil {
		logger.Fatalf("Get github context: %v\n", err)
	}

	switch githubContext.EventName {
	case "pull_request", "pull_request_target":
		logger.Infoln("@EventName is PR")

		actionType, ok := githubContext.Event["action"].(string)
		if !ok {
			logger.Fatalln("Action type is not string")
		}

		number := int(githubContext.Event["number"].(float64))
		if err := action.Run(number, actionType); err != nil {
			logger.Fatalln(err)
		}
	}
}
