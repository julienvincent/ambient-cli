import { command, option } from 'cli-core'
import fs from 'fs-extra'
import _ from 'lodash'
import os from 'os'
import {add as addDir, findDir, use as useDir, config} from '../utils'

const add = command("add", "add a directory",
    () => 'A name must be provided',

    command(':name', 'The name of the ambient environment', name => {
        let dir = process.cwd() || option('dir')
        const alias = option('alias') || option('a') || ''
        const logDir = option('logs')

        if (name.toLowerCase() == 'all') return '[All] is a reserved name. Please use something else.'

        try {
            const stats = fs.lstatSync(dir);
            if (!stats.isDirectory()) {
                return `The path '${dir}' is not a directory`
            }
        } catch (e) {
            return `The path '${dir}' does not exist`
        }

        const directory = findDir(name, alias)

        if (directory) {
            if (option('overwrite')) {
                config.directories = _.without(config.directories, directory)
            } else {
                return `The environment with name or alias [${name}, ${alias}] already exists`
            }
        }

        const next = {
            name: name,
            alias: alias,
            root: dir,
            logDir: logDir || `${os.homedir()}/.ambient/logs/${name}`
        }
        
        addDir(next)
        if (option('use')) useDir(name)

        return `Successfully added directory [${name}]`
    })
)

const remove = command("remove|rm", "remove a directory",
    () => {

    }
)

const use = command("use", "specify a directory to default commands to",
    () => {

    }
)

export { add, remove, use }