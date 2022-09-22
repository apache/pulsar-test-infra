package ctl

import (
	"github.com/apache/pulsar-test-infra/docbot/cmd/ctl/label"
	"github.com/apache/pulsar-test-infra/docbot/cmd/ctl/title"
	"github.com/spf13/cobra"
)

// NewDocbotCommand creates a new docbot root command
func NewDocbotCommand() *cobra.Command {
	cmds := &cobra.Command{
		Use:   "docbot",
		Short: "Documentation Bot Tool",
		Long: `Automatically label pull requests based on pull requests title or body.
1. Automatically label pull requests based on the checked task list
2. Check PR title`,
	}

	cmds.AddCommand(label.NewCmdDocbotLabel())
	cmds.AddCommand(title.NewCmdTitle())
	return cmds
}
