import fs from 'fs-extra'
import os from 'os'
import _ from 'lodash'
import path from 'path'

const _dir = `${os.homedir()}/.ambient`
export let config = {
    directories: [],
    using: null
}

try {
    config = {
        ...config,
        ...JSON.parse(fs.readFileSync(`${_dir}/config.json`, 'utf8'))
    }
} catch (e) {
    console.log('Error attempting to read config file\n')
    throw e
}

const update = () => {
    try {
        fs.ensureDirSync(_dir)
        fs.writeFileSync(`${_dir}/config.json`, JSON.stringify(config, null, 3), 'utf8')
    } catch (e) {
        console.log('Error attempting to write new config to file\n')
        throw e
    }
}

export const findDir = (name, alias) => _.find(config.environments, directory => {
    name = name || null
    alias = alias || null
    return directory.name === name || directory.name === alias || directory.alias === name || directory.alias === alias
})

export const add = directory => {
    config.environments.push(directory)
    update()
}

export const use = name => {
    config.using = name
    update()
}