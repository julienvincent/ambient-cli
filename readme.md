# CLI Tool for interacting with the ambient environment

- in-development

#### Command list

```
CLI tool for interacting with ambient environments.

Usage:
ambient [command] --flags

Available commands:

────────────────────────────────────────────────────────────────────────
  - add      Add an ambient environment to list of know environments
────────────────────────────────────────────────────────────────────────
  - remove   Remove an environment from ambients known environments
────────────────────────────────────────────────────────────────────────
  - use      Tell the cli which environment to default to
────────────────────────────────────────────────────────────────────────
  - list     List all known environments
────────────────────────────────────────────────────────────────────────
  - start    Run a server
────────────────────────────────────────────────────────────────────────
  - stop     Stop ambient servers
────────────────────────────────────────────────────────────────────────
  - restart  Restart ambient servers
────────────────────────────────────────────────────────────────────────

Available flags:

─────────────────────────────────────────────────────────────────────────
 -t, --type     The type of environment
─────────────────────────────────────────────────────────────────────────
 --frontend     Filter by type frontend
─────────────────────────────────────────────────────────────────────────
 --api          Filter by type api
─────────────────────────────────────────────────────────────────────────
 --running      Filter by their running status
─────────────────────────────────────────────────────────────────────────
 --no-daemon    Disallow a server from running as a daemon
─────────────────────────────────────────────────────────────────────────
 --bundle       Bundle the environment instead of starting its server
─────────────────────────────────────────────────────────────────────────
 --development  Start a server in development
─────────────────────────────────────────────────────────────────────────
 --production   Start a server in production
─────────────────────────────────────────────────────────────────────────
```

## Usage with non-ambient environments

add a `.ambient` file to your projects root.

```javascript
{
  "type": "frontend",
  "command": "node",
  "script": "src/server.js"
}
```

ambient-cli will run the file at `script` using `command`