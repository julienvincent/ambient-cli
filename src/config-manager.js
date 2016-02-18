import fs from 'fs-extra'
import os from 'os'
import _ from 'lodash'
import path from 'path'
import monitor from './monitor'

export const configManager = () => {
    let config = {
        environments: [],
        inUse: {
            frontend: '',
            api: ''
        }
    }
    let dir = `${os.homedir()}/.ambient/config.json`

    try {
        config = {
            ...config,
            ...JSON.parse(fs.readFileSync(dir, 'utf8'))
        }
    } catch (e) {
    }

    const findEnvironment = name => _.find(config.environments, environment => environment.name == name)

    const formatted = environments => {
        return _.join(_.map(environments, environment => `${environment.name}\t${environment.type}\t${environment.path}`), '\n')
    }

    const getEnvironments = (opts, cb) => {
        let environments = _.filter(config.environments, environment => {
            let matches = true

            if (opts.api) {
                if (environment.type != 'api') {
                    matches = false
                }
            }

            if (opts.frontend) {
                if (environment.type != 'frontend') {
                    matches = false
                }
            }

            if (opts.type) {
                if (environment.type != opts.type) {
                    matches = false
                }
            }

            return matches
        })

        if (opts.running) {
            monitor.list(res => {
                environments = _.filter(environments, environment => _.find(res, instance => (
                        instance.uid == `${environment.name}-${environment.type}`
                    )))
                if (!opts.format) {
                    cb(environments)
                } else {
                    console.log(formatted(environments))
                }
            })
        } else {
            if (!opts.format) {
                return environments
            } else {
                return formatted(environments)
            }
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

    const addEnvironment = (name, type, path, updateCurrent) => {
        if (findEnvironment(name)) {
            return 'EINUSE'
        }

        if (name == 'all') {
            return 'ERESERVED'
        }

        config.environments.push({
            name: name,
            type: type,
            path: path
        })

        if (updateCurrent && type) {
            setCurrentEnvironment(name)
        }

        return mergeConfig(config)
    }

    const removeEnvironment = name => {
        const environment = findEnvironment(name)
        if (!environment) {
            return 'ENOENV'
        }

        config.environments = _.without(config.environments, environment)
        config.inUse = _.mapValues(config.inUse, value => value == name ? "" : value)

        return mergeConfig(config)
    }

    const setCurrentEnvironment = (name, type) => {
        const environment = findEnvironment(name)

        if (!environment) {
            return 'ENOENV'
        }

        if (!environment.type) {
            environment.type = type
        }

        config.inUse[environment.type] = environment.name

        if (mergeConfig(config)) {
            return {
                type: environment.type
            }
        } else {
            return false
        }
    }

    return {
        getConfig: getConfig,
        findEnvironment: findEnvironment,
        getEnvironments: getEnvironments,
        formatted: formatted,
        addEnvironment: addEnvironment,
        removeEnvironment: removeEnvironment,
        setCurrentEnvironment: setCurrentEnvironment,
        mergeConfig: mergeConfig,
        interpret: interpret
    }
}