import fs from 'fs-extra'
import os from 'os'
import _ from 'lodash'
import path from 'path'

const _dir = `${os.homedir()}/.ambient`
export let config = {
    locations: [],
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

export const findDir = (name, alias) => _.find(config.locations, location => {
    name = name || null
    alias = alias || null
    return location.name === name || location.name === alias || location.alias === name || location.alias === alias
})

export const findDefault = () => _.find(config.locations, location => location.name == config.using)

export const add = location => {
    config.locations.push(location)
    update()
}

export const use = name => {
    config.using = name
    update()
}

export const useDefault = cb => {
    const location = findDefault()
    if (location) {
        console.log(`[Using ${location.name}]\n`)
        cb(location)
    } else {
        console.log('No location name was specified and no location directory has been configured')
    }
}

export const getLocationInformation = name => {
    const {root} = findDir(name)

    let ambient = {}

    try {
        ambient = fs.readJsonSync(path.join(root, '.ambient.json'), {throw: false}) || {}
    } catch (e) {
        // ignore
    }

    let pkg = null
    try {
        pkg = fs.readJsonSync(path.join(root, 'package.json'), {throw: false})
    } catch (e) {
        // ignore
    }
    let packageRoot = null

    if (!pkg) {
        try {
            pkg = fs.readJsonSync(path.join(root, 'src/package.json'), {throw: false})
        } catch (e) {
            // ignore
        }
        
        if (!pkg) {
            pkg = {}
        } else {
            packageRoot = path.join(root, 'src')
        }
    }

    return {
        ...ambient,
        root: path.join(root, ambient.root || ''),
        scripts: pkg.scripts || {},
        packageRoot
    }
}