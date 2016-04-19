import fs from 'fs-extra'
import os from 'os'
import _ from 'lodash'
import path from 'path'
import { spawn } from 'child_process'
import monitor from './monitor'
import { getBareOptions } from './core'

export const configManager = () => {
    let config = {
        environments: [],
        using: null
    }
    const dir = `${os.homedir()}/.ambient/config.json`

    try {
        config = {
            ...config,
            ...JSON.parse(fs.readFileSync(dir, 'utf8'))
        }
    } catch (e) {
        console.log(`Error attempting to read config file: ${e}`)
    }

    const getEnvironmentLocations = name => {
        let found = false
        const environment = typeof name == 'object' ? name : findEnvironment(name)
        const locations = {
            ambient: {},
            root: environment.path,
            primaryRoot: environment.path,
            script: false,
            package: {}
        }

        try {
            locations.ambient = JSON.parse(fs.readFileSync(path.join(environment.path, '.ambient'), 'utf8'))
            found = true
        } catch (e) {
            // ignore
        }

        try {
            locations.package = JSON.parse(fs.readFileSync(path.join(environment.path, 'package.json'), 'utf8'))
            found = true
        } catch (e) {
            try {
                locations.package = JSON.parse(fs.readFileSync(path.join(environment.path, 'src/package.json'), 'utf8'))
                locations.package.root = path.join(environment.path, 'src')
                found = true
            } catch (e) {
                // ignore
            }
        }

        if (locations.ambient.root) {
            locations.primaryRoot = path.join(locations.root, locations.ambient.root)
        } else if (locations.package) {
            locations.primaryRoot = path.join(locations.root, 'src')
        }

        if (!found) return false
        return locations
    }

    const findEnvironment = (name, alias) => _.find(config.environments, environment => {
        name = name || null
        alias = alias || null
        return environment.name === name || environment.name === alias || environment.alias === name || environment.alias === alias
    })

    const formatted = environments => {
        return _.map(environments, environment => [
            config.using == environment.name ? `\x1b[1m\x1b[31m[\x1b[32m${environment.name}\x1b[31m]\x1b[0m` : `\x1b[0m\x1b[36m${environment.name}\x1b[0m`,
            environment.alias || '',
            environment.running ?
                (environment.running.restarts > 0 ? `\x1b[31mFailing [${environment.running.restarts}]\x1b[0m` : '\x1b[32mrunning\x1b[0m')
                : 'stopped',
            environment.path
        ])
    }

    const getEnvironments = (opts, logger) => {
        let environments = config.environments

        const runningProcesses = monitor.list()

        environments = _.map(environments, environment => (
        {
            ...environment,
            ...{
                running: _.find(runningProcesses, instance => instance.name == environment.name) || false
            }
        }
        ))
        if (opts.running) {
            environments = _.filter(environments, environment => environment.running)
        }

        if (environments.length) {
            logger(...formatted(environments))
        } else {
            console.log('No configured environments.')
        }
    }

    const mergeConfig = newConfig => {
        try {
            fs.ensureDirSync(path.join(dir, '../'))
            fs.writeFileSync(dir, JSON.stringify(newConfig, null, 3), 'utf8')

            return true
        } catch (e) {
            return 'EBADCONF'
        }
    }

    const interpret = res => {
        switch (res) {
            case 'ENOENV':
                console.log('Please specify a known environment')
                return false
            case 'ERESERVED':
                console.log('That is a reserved name')
                return false
            case 'EINUSE':
                console.log('That name is already in use')
                return false
            case 'EBADCONF':
                console.log('Error updating config file')
                return false
            case 'EAINUSE':
                console.log('Alias cannot be the same as another environments name')
                return false
            case 'ENODEF':
                console.log('No default environment has been set. You can set one by using the "use" command')
                return false
            default:
                return res
        }
    }

    const getConfig = section => {
        if (section) {
            return config[section]
        } else {
            return config
        }
    }

    const addEnvironment = (env) => {
        const {name, alias, use, path, force, update, newName} = env
        const environment = findEnvironment(name, alias)
        const newEnvironment = {
            name: name,
            alias: alias,
            path: path
        }

        if (update) {
            if (!environment) {
                return 'ENOENV'
            }

            _.forEach(config.environments, (env, index) => {
                if (env == environment) {
                    config.environments[index].name = newName || config.environments[index].name
                    config.environments[index].alias = alias || config.environments[index].alias
                    config.environments[index].path = path || config.environments[index].path
                }
            })

            if (use) config.using = newEnvironment.name
            return mergeConfig(config)
        }

        if (environment) {
            if (environment.name == name || (alias && environment.name === alias)) {
                if (force) {
                    monitor.stop(environment, true)
                    config.environments = _.without(config.environments, environment)
                } else {
                    return 'EAINUSE'
                }
            }

            if (environment.alias == name || (alias && environment.alias === alias)) {
                environment.alias = null
            }
        }

        if (name == 'all') {
            return 'ERESERVED'
        }

        config.environments.push(newEnvironment)
        if (use) config.using = newEnvironment.name

        return mergeConfig(config)
    }

    const useEnvironment = (name) => {
        const environment = findEnvironment(name)

        if (!environment) {
            return interpret('ENOENV')
        }
        config.using = (environment.name)

        return mergeConfig(config)
    }

    const defaultEnv = () => {
        const env = findEnvironment(config.using)
        if (!env) {
            return interpret('ENODEF')
        }

        return env.name
    }

    const removeEnvironment = name => {
        const environment = findEnvironment(name)
        if (!environment) {
            return 'ENOENV'
        }

        monitor.stop(environment, true)
        config.environments = _.without(config.environments, environment)
        config.inUse = _.mapValues(config.inUse, value => value == name ? "" : value)

        return mergeConfig(config)
    }

    const findCommands = name => {
        const locations = getEnvironmentLocations(name)

        return {
            ambient: _.map(locations.ambient.commands, (command, key) => key),
            package: _.map(locations.package.scripts, (script, key) => key)
        }
    }

    const formatCommandString = string => {
        const commands = _.split(string, '&&')

        return _.map(commands, command => {
            const args = _.filter(_.split(command, ' '), arg => arg != ' ' && arg != '')

            const formatted = []
            let seq = null
            _.forEach(args, split => {
                if (!seq) {
                    if (split.substring(0, 1) == '"') {
                        seq = ''
                        seq += split
                        if (split.substring(split.length - 1) == '"') {
                            formatted.push(seq)
                            seq = null
                        }
                    } else {
                        formatted.push(split)
                    }
                } else {
                    if (split.substring(split.length - 1) == '"') {
                        seq += ` ${split}`
                        formatted.push(seq)
                        seq = null
                    } else {
                        seq += ` ${split}`
                    }
                }
            })

            return formatted
        })
    }

    const findCommand = (command, environment) => {
        const locations = getEnvironmentLocations(environment)

        let _command = {
            args: [],
            root: locations.primaryRoot,
            script: null,
            command: 'node'
        }
        let found = _.find(locations.ambient.commands, (opts, commandName) => command === commandName)
        if (found) {
            _command.args = found.args || []
            _command.script = found.script || null
            _command.command = found.command || 'node'

            if (found.root) {
                _command.root = path.join(environment.path, found.root)
            }

            if (found.plainCommand) {
                const formatted = formatCommandString(found.plainCommand)
                let root = _command.root
                if (found.root) {
                    root = path.join(environment.path, found.root)
                } else {
                    root = environment.path
                }

                _command = _.map(formatted, command => ({
                    args: _.without(command, command[0]),
                    root,
                    script: null,
                    command: command[0]
                }))
            }
        } else {
            found = _.map(_.pickBy(locations.package.scripts, (opts, commandName) => command === commandName), (v, key) => key)
            if (found && found.length) {
                _command = {
                    command: 'npm',
                    args: ['run', found[0]],
                    root: locations.package.root || locations.root
                }
            } else {
                found = false
            }
        }

        if (found) {
            if (Array.isArray(_command)) {
                return _command
            } else {
                return [_command]
            }
        }
        return false
    }

    const runCommand = (command, name, base, noChange, cb) => {
        try {
            const environment = findEnvironment(name)
            if (!environment) {
                return interpret('ENOENV')
            }

            const formatted = formatCommandString(command)
            let relative = null

            const run = (commands, i = 0, root, done) => {
                const fullCommand = commands[i]
                const _command = fullCommand[0]

                if (root) {
                    process.chdir(root)
                } else if (base) {
                    process.chdir(environment.path)
                } else if (!noChange) {
                    const locations = getEnvironmentLocations(name)
                    process.chdir(locations.primaryRoot)
                }

                if (_command == 'cd') {
                    relative = fullCommand[1]
                    if (formatted[i + 1]) {
                        run(commands, i + 1)
                    } else {
                        if (cb) cb()
                    }

                    return
                }

                const preConfigured = findCommand(_command, environment)
                if (preConfigured) {
                    const runAll = (_commands, i = 0) => {
                        const command = _commands[i]
                        return run(
                            [[command.command || 'node', ..._.filter([command.script || null, ...command.args || []], arg => arg !== null)]],
                            0,
                            command.root,
                            () => {
                                if (_commands[i + 1]) {
                                    runAll(_commands, i + 1)
                                } else {
                                    if (done) return done()
                                    if (cb) return cb()
                                }
                            }
                        )
                    }

                    return runAll(preConfigured)
                }

                if (relative) {
                    process.chdir(path.join(process.cwd(), relative))
                    relative = null
                }

                console.log(_command, [..._.without(fullCommand, _command), ...getBareOptions()])

                const _process = spawn(_command, [..._.without(fullCommand, _command), ...getBareOptions()], {
                    stdio: 'inherit'
                })

                if (commands[i + 1]) {
                    _process.on('close', () => run(commands, i + 1))
                } else {
                    if (done) return _process.on('close', done)
                    if (cb) _process.on('close', cb)
                }
            }

            run(formatted)
        } catch (e) {
            console.log(e)
        }
    }

    return {
        getConfig,
        findEnvironment,
        getEnvironments,
        formatted,
        addEnvironment,
        removeEnvironment,
        mergeConfig,
        interpret,
        useEnvironment,
        defaultEnv,
        getEnvironmentLocations,
        runCommand,
        findCommands
    }
}