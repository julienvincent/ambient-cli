# ambient-cli

Cli tool for interacting with development environments from anywhere

#### Command list

```
Cli tool for interacting with development environments from anywhere.

Usage:
ambient [command] --flags

Available commands:

  - add      Add an ambient environment to list of know environments
  - remove   Remove an environment from ambients known environments
  - update   Update an environment (TOODO)
  - list     List all known environments
  - use      Specify a default environment
  - start    Run a server
  - stop     Stop ambient servers
  - restart  Restart ambient servers
  - run      Run a command on an environments root relative root. -b, --base to run at projects real base
  - lint     Attempt to run "npm run lint" at an environments root
  - install  Install a package using npm [or --jspm]
  - logs     display logs for a given process

Available flags:

 -a, --alias        Set an alias name for the environment
 -u, --use          Set this environment as default.
 -f, --force        Force an action to happen. Commonly used to overwrite an existing environment
 --name             Specify a new name when updating an environment
 --dir              Explicitly set the root directory of an environment when adding or updating it
 -l, --logs         Directory to store logs when running processes
 -R, --reuse        Reuse an old process (including its runtime options and arguments)
 -b, --base         Reference an environments base
 -i, --interactive  Run a command in interactive mode
 -t, --timeout      Set a timeout for operations
 --running          Filter by environments' running status
 -d, --daemon       Start a server as a daemon
 --no-parse         When listing running environments, display a direct listing of running processes
 --no-save          Install a module without saving it
```

## Specifying custom runtime settings.

ambient-cli will look for a `.ambient` file in your projects root. In this file you can configure how ambient must run your project

```javascript
{
  "command": "node", // The service to run your script with. Defaults to node
  "script": "core/server.js", // The location of your script relative to root
  "root": "src", // The root of your project. Set it to the directory of your node_modules if using node.
  
  // You can also predefine commands. These commands can be run using `ambient run build` or `ambient run start`
  "commands": {
    "build": {
        "plainCommand": "npm run build",
        "root": "src"
    },
    
    "start": {
        "command": "node",
        "script": "core/server.js",
        "root": "src"
    }
  }
}
```

If you want `ambient list` to keep track of running environments that are container based, then do not run them as daemons. eg:

```javascript
{
  "command": "docker-compose up container", // instead of `docker-compose up -d container`
}
```

If no `.ambient` file is found, the cli will look for a `package.json` in either your projects root or in a `src` sub directory. It will then run the script at `main` using node.