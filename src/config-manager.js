import fs from 'fs-extra'
import os from 'os'
import _ from 'lodash'
import path from 'path'
import monitor from './monitor'

export const configManager = () => {
    let config = {
        environments: [],
        using: null
    }
    let dir = `${os.homedir()}/.ambient/config.json`

    try {
        config = {
            ...config,
            ...JSON.parse(fs.readFileSync(dir, 'utf8'))
        }
    } catch (e) {
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
                (environment.running.restarts > 0 ? `Failing [${environment.running.restarts}]` : 'running')
                : 'stopped',
            environment.path
        ])
    }

    const getEnvironments = (opts, logger) => {
        let environments = config.environments

        monitor.list(res => {
            environments = _.map(environments, environment => (
            {
                ...environment,
                ...{
                    running: _.find(res, instance => instance.uid == `_${environment.name}_`) || false
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
        })
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

    const addEnvironment = (name, alias, path, force, use) => {
        const environment = findEnvironment(name, alias)
        let newEnvironment = {
            name: name,
            alias: alias,
            path: path
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
        defaultEnv
    }
}