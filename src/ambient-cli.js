#!/usr/bin/env node
import { command, option, flags, define, init } from './core'
import { configManager } from './config-manager'
import fs from 'fs'
import monitor from './monitor'
import log from './logger'
const manager = configManager()
import path from 'path'
import prompt from './prompt'
import _ from 'lodash'

define(
    command('add', 'Add an ambient environment to list of know environments',
        () => 'A name must be provided',
        command(':name', 'The name of the ambient environment', name => {
            let dir = process.cwd()
            const alias = option('alias') || option('a')
            const forcedDir = option('dir')

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

            if (manager.interpret(manager.addEnvironment({
                    name,
                    alias,
                    path: dir,
                    force: option('force') || option('f'),
                    use: option('use') || option('u')
                }))) {
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
            let dir = process.cwd()
            const alias = option('alias') || option('a')
            const forcedDir = option('dir')

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

            if (manager.interpret(manager.addEnvironment({
                    name,
                    newName: option('name'),
                    alias,
                    path: dir,
                    force: option('force') || option('f'),
                    use: option('use') || option('u'),
                    update: true
                }))) {
                return `updated environment ${name}`
            }
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
                return monitor.list()
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

                let daemon = option('d') || option('daemon')
                if (option('bundle')) {
                    daemon = false
                }

                let logs = option('l') || option('logs')
                if (logs) {
                    if (logs.substring(0, 1) != '/') {
                        logs = path.join(process.cwd(), logs)
                    }
                }

                monitor.start(environment, daemon, logs, option('R') || option('reuse'), option('t') || option('timeout'))
            }

            return {
                log: () => {
                    const env = manager.defaultEnv()
                    console.log(`[Using ${env}]`)
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

                if (monitor.stop(environment, option('t') || option('timeout')) === false) {
                    console.log(`No running process [${name}]`)
                }
            }

            return {
                log: () => {
                    const env = manager.defaultEnv()
                    console.log(`[Using ${env}]`)
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
            () => monitor.stopAll()
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

                monitor.restart(environment, option('t') || option('timeout'))
            }

            return {
                log: () => {
                    const env = manager.defaultEnv()
                    console.log(`[Using ${env}]`)
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
    command('run', 'Run a command on an environments root relative root. -b, --base to run at projects real base',
        () => {
            const run = (name, command, interactive) => {
                if (interactive) {
                    const ask = () => {
                        prompt(process.cwd(), (err, result) => {
                            if (!err) {
                                const args = _.split(result, ' ')
                                const p = args[0]
                                if (p == 'cd') {
                                    process.chdir(args[1])
                                    return ask()
                                }
                                if (p == 'exit') {
                                    return
                                }
                                if (p == 'ambient') {
                                    console.log('\x1b[31mCannot run ambient from within an ambient process.')
                                    return ask()
                                }
                                if (p == '') {
                                    return ask()
                                }

                                manager.runCommand(result, name, null, true, ask)
                            }
                        });
                    }
                    const environment = manager.findEnvironment(name)

                    if (!environment) {
                        return manager.interpret('ENOENV')
                    }

                    process.chdir(environment.path)
                    ask()
                } else {
                    manager.runCommand(command, name, option('b') || option('base'))
                }
            }

            return {
                log: () => {
                    if (option('i') || option('interactive')) {
                        const env = manager.defaultEnv()
                        console.log(`[Using ${env}]`)
                        if (env) run(env, null, true)
                    } else {
                        console.log('Please specify an environment name and a command')
                    }
                },
                payload: {
                    run
                }
            }
        },
        command('i:interactive', 'Interactively run commands at an environment',
            (name, payload) => ({
                log: () => {
                    const env = manager.defaultEnv()
                    console.log(`[Using ${env}]`)
                    if (env) payload.run(env, null, true)
                },
                payload: {
                    run: payload.run
                }
            }),

            command(':name', 'The name of the environment to run the commands at',
                (name, payload) => payload.run(name, null, true)
            )
        ),

        command(':name', 'The environment to install to',
            (name, payload) => ({
                log: () => {
                    let env = manager.findEnvironment(name)
                    if (!env) {
                        env = manager.defaultEnv()
                        console.log(`[Using ${env}]`)
                    } else {
                        env = env.name
                    }
                    if (env) payload.run(env, name, option('i') || option('interactive'))
                },
                payload: {
                    run: payload.run,
                    name
                }
            }),

            command(':command', 'The command to run',
                (command, payload) => payload.run(payload.name, command, option('i') || option('interactive'))
            )
        )
    )
)

define(
    command('lint', 'Attempt to run "npm run lint" at an environments root',
        () => {
            const lint = name => manager.runCommand("npm run lint", name)

            return {
                log: () => {
                    const env = manager.defaultEnv()
                    console.log(`[Using ${env}]`)
                    if (env) {
                        lint(env)
                    }
                },
                payload: {
                    lint
                }
            }
        },
        command(':name', 'The environment to install to',
            (name, payload) => payload.lint(name)
        )
    )
)

define(
    command('install', 'Install a package using npm [or --jspm]',
        () => 'Please specify an environment name and a package name',

        command(':name', 'The name of the environment',
            name => {
                const install = (packageName, name) => {
                    const packageManager = option('jspm') ? 'jspm' : 'npm'
                    let save = ' --save'
                    if (option('save') === false) save = ''
                    if ('save-dev') save = ' --save-dev'
                    if (option('jspm')) save = ''
                    manager.runCommand(`${packageManager} install ${packageName}${save}`, name)
                }

                return {
                    log: () => {
                        const env = manager.defaultEnv()
                        console.log(`[Using ${env}]`)
                        if (env) {
                            install(name, env)
                        }
                    },

                    payload: {
                        install,
                        name
                    }
                }
            },

            command(':package', 'The package to install',
                (packageName, payload) => payload.install(packageName, payload.name)
            )
        )
    )
)

define(
    command('logs', 'display logs for a given process',
        () => {
            const logs = name => {
                const environment = manager.findEnvironment(name)

                if (!environment) {
                    return manager.interpret('ENOENV')
                }

                const _process = monitor.getProcess(environment.name)
                if (_process) {
                    manager.runCommand(`cat ${path.join(_process.logDir, `${environment.name}.log`)}`, environment.name)
                } else {
                    manager.runCommand(`cat ${path.join(os.homedir(), `.ambient/logs/${environment.name}.log`)}`, environment.name)
                }
            }

            return {
                log: () => {
                    const env = manager.defaultEnv()
                    console.log(`[Using ${env}]`)
                    if (env) {
                        logs(env)
                    }
                },

                payload: {
                    logs
                }
            }
        },

        command(':name', 'The name of the environment',
            (name, payload) => payload.logs(name)
        )
    )
)

flags(
    ['-a, --alias', 'Set an alias name for the environment'],
    ['-u, --use', 'Set this environment as default.'],
    ['-f, --force', 'Force an action to happen. Commonly used to overwrite an existing environment'],
    ['--name', 'Specify a new name when updating an environment'],
    ['--dir', 'Explicitly set the root directory of an environment when adding or updating it'],
    ['-l, --logs', 'Directory to store logs when running processes'],
    ['-R, --reuse', 'Reuse an old process (including its runtime options and arguments)'],
    ['-b, --base', 'Reference an environments base'],
    ['-i, --interactive', 'Run a command in interactive mode'],
    ['-t, --timeout', 'Set a timeout for operations'],
    ['--running', 'Filter by environments\' running status'],
    ['-d, --daemon', 'Start a server as a daemon'],
    ['--no-parse', 'When listing running environments, display a direct listing of running processes'],
    ['--no-save', 'Install a module without saving it']
)

init()