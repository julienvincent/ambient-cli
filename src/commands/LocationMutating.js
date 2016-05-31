import { command, option } from 'cli-core'
import fs from 'fs-extra'
import _ from 'lodash'
import os from 'os'
import { add as addDir, findDir, use as useDir, config } from '../utils'

const add = command("add", "add a location",
    () => 'A name must be provided',

    command(':name', 'The name of the location', name => {
        let dir = process.cwd() || option('dir')
        const alias = option('alias') || option('a') || ''
        const logDir = option('logs')

        if (name.toLowerCase() == 'all') return '[All] is a reserved name. Please use something else.'

        try {
            const stats = fs.lstatSync(dir);
            if (!stats.isDirectory()) {
                return `The path '${dir}' is not a location`
            }
        } catch (e) {
            return `The path '${dir}' does not exist`
        }

        const location = findDir(name, alias)

        if (location) {
            if (option('overwrite')) {
                config.locations = _.without(config.locations, location)
            } else {
                return `The location with name or alias [${name}, ${alias}] already exists`
            }
        }

        const next = {
            name: name,
            alias: alias,
            root: dir,
            logFile: logDir || `${os.homedir()}/.ambient/logs/${name}`
        }

        addDir(next)
        if (option('use')) useDir(name)

        return `Successfully added location [${name}]`
    })
)

const remove = command("remove|rm", "remove a location",
    () => {

    }
)

const use = command("use", "specify a directory to default commands to",
    () => 'A directory needs to be specified',

    command(":name", "The name of the directory to use",
        ({name}) => {
            const directory = findDir(name)
            if (directory) {
                useDir(name)
                return `Now using directory [${name}] as the default directory for further commands`
            }
            return 'Please enter a valid directory'
        }
    )
)

export { add, remove, use }