#!/usr/bin/env node
import { command, option, flags, define, help, init } from './core'
import { configManager } from './config-manager'
import fs from 'fs'
import monitor from './monitor'
import log from './logger'

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

            const config = configManager()

            if (config.interpret(config.addEnvironment(name, alias, dir, option('force') || option('f')))) {
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
                const config = configManager()

                if (option('force') || option('f')) {
                    config.getConfig().environments.forEach(environment => config.removeEnvironment(environment.name))

                    return 'All environments removed'
                } else {
                    return 'This is a dangerous action! If you are sure you would like to do this then run with --force'
                }
            }
        ),

        command(':name', "The name of the environment ambient must remove", name => {
            const config = configManager()

            if (config.interpret(config.removeEnvironment(name))) {
                return `Removed the environment ${name}`
            }
        })
    )
)

define(
    command('update', 'Update an environment',
        () => 'A name must be provided',
        command(':name', "The name of the environment ambient must remove", name => {
            const config = configManager()

            if (config.interpret(config.removeEnvironment(name))) {
                return `Removed the environment ${name}`
            }
        })
    )
)

define(
    command('cd', 'Navigate to the environments root',
        () => 'A name must be provided',
        command(':name', "The name of the environment to go to", name => {
            const environment = configManager().findEnvironment(name)

            if (!environment) {
                return 'Please specify a known environment'
            }

            // change directories
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
                    configManager().getEnvironments(config, logger)
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

            configManager().getEnvironments({
                ...payload.config,
                ...{
                    running: true
                }
            }, payload.logger)
        })
    )
)

define(
    command('start', 'Run a server',
        () => 'Please specify an environment',
        command(':name', 'Start the specified environment', name => {
            const environment = configManager().findEnvironment(name)

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
        })
    )
)

define(
    command('stop', 'Stop ambient servers',
        () => 'Please specify a name',
        command('all', 'Stop all servers.',
            () => {
                monitor.stopAll()
            }
        ),

        command(':name', 'Stop the specified environment', name => {
            const environment = configManager().findEnvironment(name)

            if (!environment) {
                return 'Please specify a known environment'
            }

            console.log('Stopping server...')

            monitor.stop(environment)
        })
    )
)

define(
    command('restart', 'Restart ambient servers',
        () => 'Please specify a name',

        command(':name', 'Restart the specified environment', name => {
            const environment = configManager().findEnvironment(name)

            if (!environment) {
                return 'Please specify a known environment'
            }

            console.log('Restarting server...')

            monitor.restart(environment)
        })
    )
)

flags(
    ['-a, --alias', 'Set an alias name for the environment'],
    ['-f, --force', 'Force an action to happen. Commonly used to overwrite an existing environment'],
    ['-d, --dir', 'Explicitly set the root directory of an environment when adding or updating it'],
    ['--running', 'Filter by their running status'],
    ['--no-daemon', 'Disallow a server from running as a daemon'],
    ['--no-parse', 'When listing running environments, display a direct listing of running processes'],
    ['--bundle', 'Bundle the environment instead of starting its server'],
    ['--development', 'Start a server in development'],
    ['--production', 'Start a server in production']
)

init()