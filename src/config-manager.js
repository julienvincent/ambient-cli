import fs from 'fs-extra'
import os from 'os'
import _ from 'lodash'
import path from 'path'

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

    const mergeConfig = newConfig => {
        try {
            fs.ensureDirSync(path.join(dir, '../'))
            fs.writeFileSync(dir, JSON.stringify(newConfig, null, 3), 'utf8')

            return true
        } catch (e) {
            return false
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
        addEnvironment: addEnvironment,
        removeEnvironment: removeEnvironment,
        setCurrentEnvironment: setCurrentEnvironment,
        mergeConfig: mergeConfig
    }
}