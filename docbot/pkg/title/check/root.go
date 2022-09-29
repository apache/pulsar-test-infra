package check

import (
	"context"

	"github.com/apache/pulsar-test-infra/docbot/pkg/logger"
	"github.com/sethvargo/go-githubactions"
)

func ActionCheckWithPRTitle() error {
	logger.Infoln("@Start check PR title helper")

	githubAction := githubactions.New()
	cfg, err := NewActionConfig(githubAction)
	if err != nil {
		logger.Fatalf("Get action config: %v\n", err)
	}

	ctx := context.Background()
	action := NewAction(ctx, cfg)

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
	return nil
}
