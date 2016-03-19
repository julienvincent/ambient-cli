#!/usr/bin/env node
import { command, option, flags, define, help, init } from './core'
import { configManager } from './config-manager'
import fs from 'fs'
import monitor from './monitor'
import log from './logger'
const manager = configManager()

define(
    command('add', 'Add an ambient environment to list of know environments',
        () => 'A name must be provided',
        command(':name', 'The name of the ambient environment', name => {
            let dir = process.cwd()
            let alias = option('alias') || option('a')
            const forcedDir = option('d') || option('dir')

            if (forcedDir) {
                try {
                    const stats = fs.lstatSync(forcedDir);
                    if (stats.isDirectory()) {
                        dir = forcedDir
                    } else {
                        return `The path '${forcedDir}' is not a directory`
                    }
                }
                catch (e) {
                    return `The path '${forcedDir}' does not exist`
                }
            }

            if (manager.interpret(manager.addEnvironment(name, alias, dir, option('force') || option('f'), option('use') || option('u')))) {
                return `Added environment ${name}`
            }
        })
    )
)

define(
    command('remove', 'Remove an environment from ambients known environments',
        () => 'A name must be provided',
        command('all', 'Remove all environments. Must be run with --force, -f',
            () => {
                if (option('force') || option('f')) {
                    manager.getConfig().environments.forEach(environment => manager.removeEnvironment(environment.name))

                    return 'All environments removed'
                } else {
                    return 'This is a dangerous action! If you are sure you would like to do this then run with --force'
                }
            }
        ),

        command(':name', "The name of the environment ambient must remove", name => {
            if (manager.interpret(manager.removeEnvironment(name))) {
                return `Removed the environment ${name}`
            }
        })
    )
)

define(
    command('update', 'Update an environment (TOODO)',
        () => 'A name must be provided',
        command(':name', "The name of the environment ambient must remove", name => {

        })
    )
)

define(
    command('list', 'List all known environments',
        () => {
            const config = {
                format: true,
                running: option('running')
            }
            const logger = log(['Name', 'Alias', 'Status', 'Path'])

            return {
                log: () => {
                    manager.getEnvironments(config, logger)
                },
                payload: {
                    config: config,
                    logger: logger
                }
            }
        },
        command('running', "List all running environments", (name, payload) => {
            if (option('parse') === false) {
                return monitor.list('BYPASS')
            }

            manager.getEnvironments({
                ...payload.config,
                ...{
                    running: true
                }
            }, payload.logger)
        })
    )
)

define(
    command('use', 'Specify a default environment',
        () => 'Please specify an environment name',
        command(':name', 'The environment to install to',
            name => {
                if (manager.useEnvironment(name)) {
                    return `Further commands will now default to environment [${name}]`
                }
            }
        )
    )
)

define(
    command('start', 'Run a server',
        () => {
            const start = name => {
                const environment = manager.findEnvironment(name)

                if (!environment) {
                    return 'Please specify a known environment'
                }

                console.log('Starting server...')

                let daemon = true
                if (option('daemon') === false) {
                    daemon = false
                } else if (option('bundle')) {
                    daemon = false
                }

                monitor.start(environment, daemon)
            }

            return {
                log: () => {
                    console.log('Running command on default environment.')
                    const env = manager.defaultEnv()
                    if (env) {
                        start(env)
                    }
                },
                payload: {
                    start
                }
            }
        },
        command(':name', 'Start the specified environment', (name, payload) => payload.start(name))
    )
)

define(
    command('stop', 'Stop ambient servers',
        () => {
            const stop = name => {
                const environment = manager.findEnvironment(name)

                if (!environment) {
                    return 'Please specify a known environment'
                }

                console.log('Stopping server...')

                monitor.stop(environment)
            }

            return {
                log: () => {
                    console.log('Using default environment\n')
                    const env = manager.defaultEnv()
                    if (env) {
                        stop(env)
                    }
                },
                payload: {
                    stop
                }
            }
        },
        command('all', 'Stop all servers.',
            () => {
                monitor.stopAll()
            }
        ),

        command(':name', 'Stop the specified environment', (name, payload) => payload.stop(name))
    )
)

define(
    command('restart', 'Restart ambient servers',
        () => {
            const restart = name => {
                const environment = manager.findEnvironment(name)

                if (!environment) {
                    return 'Please specify a known environment'
                }

                console.log('Restarting server...')

                monitor.restart(environment)
            }

            return {
                log: () => {
                    console.log('Using default environment.')
                    const env = manager.defaultEnv()
                    if (env) {
                        restart(env)
                    }
                },
                payload: {
                    restart
                }
            }
        },

        command(':name', 'Restart the specified environment', (name, payload) => payload.restart(name))
    )
)

define(
    command('run', 'Run a command on an environments root',
        () => 'Please specify an environment name and a command',
        command(':name', 'The environment to install to',
            name => ({
                    log: () => {
                        console.log('Using default environment\n')
                        const env = manager.defaultEnv()
                        if (env) {
                            manager.runCommand(name, env)
                        }
                    },
                    payload: {
                        run: manager.runCommand,
                        name
                    }
                }),

            command(':command', 'The command to run',
                (command, payload) => payload.run(command, payload.name)
            )
        )
    )
)

define(
    command('lint', 'Attempt to run "npm run lint" at an environments root',
        () => {
            const run = name => manager.runCommand("npm run lint", name)

            return {
                log: () => {
                    console.log('Using default environment\n')
                    const env = manager.defaultEnv()
                    if (env) {
                        run(env)
                    }
                },
                payload: {
                    run
                }
            }
        },
        command(':name', 'The environment to install to',
            (name, payload) => payload.run(name)
        )
    )
)

flags(
    ['-a, --alias', 'Set an alias name for the environment'],
    ['-u, --use', 'Set this environment as default.'],
    ['-f, --force', 'Force an action to happen. Commonly used to overwrite an existing environment'],
    ['-d, --dir', 'Explicitly set the root directory of an environment when adding or updating it'],
    ['--running', 'Filter by environments\' running status'],
    ['--no-daemon', 'Disallow a server from running as a daemon'],
    ['--no-parse', 'When listing running environments, display a direct listing of running processes'],
    ['--bundle', 'Bundle the environment instead of starting its server'],
    ['--development, --dev', 'Start a server in development'],
    ['--production, --prod', 'Start a server in production'],
    ['--port, -p', 'Specify the port a server must start on']
)

init()