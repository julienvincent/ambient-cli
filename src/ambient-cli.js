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
            let type = option('t') || option('type')
            const forcedDir = option('d') || option('dir')

            if (option('api')) {
                type = 'api'
            }
            if (option('frontend')) {
                type = 'frontend'
            }

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

            if (!type) {
                return 'A type needs to specified.'
            }

            const config = configManager()

            if (config.interpret(config.addEnvironment(name, type, dir, option('use')))) {
                return `Added environment ${name}`
            }
        })
    )
)

define(
    command('remove', 'Remove an environment from ambients known environments',
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
    command('use', 'Tell the cli which environment to default to',
        () => 'A name must be provided',
        command(':name', "The name of the environment to use", name => {
            const config = configManager()
            const res = config.setCurrentEnvironment(name)

            if (config.interpret(res)) {
                return `Set current ${res.type} to ${name}`
            }
        })
    )
)

define(
    command('list', 'List all known environments',
        () => {
            const config = {
                format: true,
                frontend: option('frontend'),
                api: option('api'),
                type: option('type') || option('t'),
                running: option('running')
            }
            const logger = log(['Name', 'Type', 'Status', 'Path'])

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
        }),
        command('api', "List all api environments", (name, payload) => {
            configManager().getEnvironments({
                ...payload.config,
                ...{
                    api: true
                }
            }, payload.logger)
        }),
        command('frontend', "List all frontend environments", (name, payload) => {
            configManager().getEnvironments({
                ...payload.config,
                ...{
                    frontend: true
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
    ['-t, --type', 'The type of environment'],
    ['--frontend', 'Filter by type frontend'],
    ['--api', 'Filter by type api'],
    ['--running', 'Filter by their running status'],
    ['--no-daemon', 'Disallow a server from running as a daemon'],
    ['--bundle', 'Bundle the environment instead of starting its server'],
    ['--development', 'Start a server in development'],
    ['--production', 'Start a server in production']
)

init()