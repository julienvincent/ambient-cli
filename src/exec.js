import { spawn } from 'child_process'
import _ from "lodash";
import fs from 'fs-extra'
import os from 'os'
import path from 'path'

export const exec = (command, options) => {
    command = {
        cmd: 'echo nothing to do',
        args: [],
        ...command || {}
    }

    const temp = `${os.homedir()}/.ambient/tmp/.temp-${_.random(10000000, 99999999)}~`
    fs.ensureFileSync(temp)
    fs.writeFileSync(temp, `${command.cmd} $*`)

    spawn('sh', [temp, ...command.args], options)
}

export const execAndWatch = conf => {
    const _process = spawn('node', [path.join(__dirname, 'watcher.js'), JSON.stringify(conf)], {stdio: 'ignore', detached: true})
    _process.unref()
}