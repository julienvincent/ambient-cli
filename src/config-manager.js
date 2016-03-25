import fs from 'fs-extra'
import os from 'os'
import _ from 'lodash'
import path from 'path'
import { spawn } from 'child_process'
import monitor from './monitor'

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
        const environment = typeof name == 'object' ? name : findEnvironment(name)
        const locations = {
            ambient: {},
            root: environment.path,
            script: false,
            package: {}
        }

        try {
            locations.ambient = JSON.parse(fs.readFileSync(path.join(environment.path, '.ambient'), 'utf8'))
            if (locations.ambient.root) {
                locations.root = path.join(locations.root, locations.ambient.root)
            }
            if (locations.ambient.script) {
                locations.script = locations.ambient.script
            }
            return locations
        } catch (e) {
            try {
                locations.package = JSON.parse(fs.readFileSync(path.join(environment.path, 'package.json'), 'utf8'))
                locations.script = locations.package.main || false
                return locations
            } catch (e) {
                try {
                    locations.package = JSON.parse(fs.readFileSync(path.join(environment.path, 'src/package.json'), 'utf8'))
                    locations.root = path.join(locations.root, 'src')
                    locations.script = locations.package.main || false
                    return locations
                } catch (e) {
                    return false
                }
            }
        }
    }

    const findEnvironment = (name, alias) => _.find(config.environments, environment => {
        name = name || null
        alias = alias || null
        return environment.name === name || environment.name === alias || environment.alias === name || environment.alias === alias
    })

    const formatted = environments => {
        return _.map(environments, environment => [
            config.using == environment.name ? `[${environment.name}]` : environment.name,
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
        const { name, alias, use, path, force, update, newName } = env
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

    const runCommand = (command, name, base, noChange, cb) => {
        try {
            const environment = findEnvironment(name)
            if (!environment) {
                return interpret('ENOENV')
            }

            if (base) {
                process.chdir(environment.path)
            } else if (!noChange) {
                const locations = getEnvironmentLocations(name)
                process.chdir(locations.root)
            }

            const args = _.split(command, ' ')

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

            const _process = spawn(formatted[0], _.without(formatted, formatted[0]), {
                stdio: 'inherit'
            })
            
            if (cb) _process.on('close', cb)
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
        runCommand
    }
}