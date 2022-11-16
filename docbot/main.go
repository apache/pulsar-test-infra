package main

import (
	"github.com/apache/pulsar-test-infra/docbot/pkg/logger"
	"github.com/sethvargo/go-githubactions"
)

func main() {
	logger.Infoln("@Start docbot")

	actionConfig, err := NewActionConfig()
	if err != nil {
		logger.Fatalf("Get action config: %v\n", err)
	}

	action := NewAction(actionConfig)

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
