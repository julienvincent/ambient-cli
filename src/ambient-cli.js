#!/usr/bin/env node
import { command, option, define, help, init } from './core'
import { configManager } from './config-manager'
import fs from 'fs'

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

            if (config.addEnvironment(name, type, dir, option('use'))) {
                return `Added environment ${name}`
            } else {
                return 'Something went wrong while updating the config file'
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

            if (res == 'ENOENV') {
                return 'Please specify a known environment'
            } else if (res) {
                return `Set current ${res.type} to ${name}`
            } else {
                return 'Something went wrong while updating the config file'
            }
        })
    )
)

define(
    command('remove', 'Remove an environment from ambients known environments',
        () => 'A name must be provided',
        command(':name', "The name of the environment ambient must remove", name => {
            const config = configManager()
            const res = config.removeEnvironment(name)

            if (res == 'ENOENV') {
                return 'Please specify a known environment'
            } else if (res) {
                return `Removed the environment ${name}`
            } else {
                return 'Something went wrong while updating the config file'
            }
        })
    )
)

init()