# CLI Tool for interacting with the ambient environment

#### Command list

```
CLI tool for interacting with ambient environments.

Usage:
ambient [command] --flags

Available commands:

  - add      Add an ambient environment to list of know environments
  - remove   Remove an environment from ambients known environments
  - update   Update an environment (TOODO)
  - list     List all known environments
  - start    Run a server
  - stop     Stop ambient servers
  - restart  Restart ambient servers

Available flags:

 -a, --alias           Set an alias name for the environment
 -f, --force           Force an action to happen. Commonly used to overwrite an existing environment
 -d, --dir             Explicitly set the root directory of an environment when adding or updating it
 --running             Filter by environments' running status
 --no-daemon           Disallow a server from running as a daemon
 --no-parse            When listing running environments, display a direct listing of running processes
 --bundle              Bundle the environment instead of starting its server
 --development, --dev  Start a server in development
 --production, --prod  Start a server in production
 --port, -p            Specify the port a server must start on
```

## Specifying custom runtime settings and usage with non-ambient environments

ambient-cli will look for a `.ambient` file in your projects root. In this file you can configure how ambient must run your project

```javascript
{
  "command": "node", // The service to run your script with
  "script": "core/server.js", // The location of your script relative to root
  "root": "src" // The root of your project. Set it to the directory of your node_modules if using node.
}
```

If you want `ambient list` to keep track of running environments that are container based, then do not run them as daemons. eg:

```javascript
{
  "command": "sh",
  "script": "container-start.sh"
}
```

```sh
#!/usr/bin/env bash
docker-compose up container
```

**Note** currently can't stop containers.