package label

import (
	"github.com/apache/pulsar-test-infra/docbot/pkg/label"
	"github.com/apache/pulsar-test-infra/docbot/pkg/util"
	"github.com/spf13/cobra"
)

type DocbotLabelOptions struct {
}

func NewDocbotLabelOptions() *DocbotLabelOptions {
	return &DocbotLabelOptions{}
}

// NewCmdDocbotLabel creates a new docbot label command
func NewCmdDocbotLabel() *cobra.Command {
	o := NewDocbotLabelOptions()
	cmd := &cobra.Command{
		Use:   "label",
		Short: "Automatically label pull requests based on the checked task list",
		Run: func(cmd *cobra.Command, args []string) {
			util.CheckErr(o.Complete(cmd, args))
			util.CheckErr(o.Validate(cmd, args))
			util.CheckErr(o.Run())
		},
	}

	return cmd
}

func (o *DocbotLabelOptions) Complete(cmd *cobra.Command, args []string) error {
	// TODO complete options with args if command set other args later
	return nil
}

func (o *DocbotLabelOptions) Validate(_ *cobra.Command, _ []string) error {
	// TODO validate options with args if command set other args later
	return nil
}

func (o *DocbotLabelOptions) Run() error {
	return label.ActionLabelWithPRBody()
}
