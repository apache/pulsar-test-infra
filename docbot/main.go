package main

import (
	"os"

	"github.com/apache/pulsar-test-infra/docbot/cmd/ctl"
)

func main() {
	cmd := ctl.NewDocbotCommand()

	// Execute adds all child commands to the root command and sets flags appropriately.
	// This is called by main.main(). It only needs to happen once to the rootCmd.
	if err := cmd.Execute(); err != nil {
		//fmt.Println(err)
		os.Exit(1)
	}
}
