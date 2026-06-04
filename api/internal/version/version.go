package version

// Version is set at link time via -ldflags.
var Version = "0.1.0-dev"

// Mode is set at link time: "server" or "desktop".
var Mode = "server"
