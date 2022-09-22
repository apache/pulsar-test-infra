package title

import "github.com/spf13/cobra"

func NewCmdTitle() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "title",
		Short: "Check pr title or automatically label pull requests based on the title",
	}

	cmd.AddCommand(NewCmdCheckPRTitle())
	return cmd
}
