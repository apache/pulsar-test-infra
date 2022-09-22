package title

import (
	"github.com/apache/pulsar-test-infra/docbot/pkg/title/check"
	"github.com/apache/pulsar-test-infra/docbot/pkg/util"
	"github.com/spf13/cobra"
)

type CheckTitleOptions struct {
}

func NewCheckTitleOptions() *CheckTitleOptions {
	return &CheckTitleOptions{}
}

// NewCmdCheckPRTitle creates a new check pr title command
func NewCmdCheckPRTitle() *cobra.Command {
	o := NewCheckTitleOptions()
	cmd := &cobra.Command{
		Use:   "check",
		Short: "Check title of pull requests to ensure your PR title matches the Pulsar Pull Request Naming Convention Guide",
		Run: func(cmd *cobra.Command, args []string) {
			util.CheckErr(o.Complete(cmd, args))
			util.CheckErr(o.Validate(cmd, args))
			util.CheckErr(o.Run())
		},
	}

	return cmd
}

func (o *CheckTitleOptions) Complete(cmd *cobra.Command, args []string) error {
	// TODO complete options with args if command set other args later
	return nil
}

func (o *CheckTitleOptions) Validate(_ *cobra.Command, _ []string) error {
	// TODO validate options with args if command set other args later
	return nil
}

func (o *CheckTitleOptions) Run() error {
	return check.ActionCheckWithPRTitle()
}
