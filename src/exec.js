import { spawn } from 'child_process'
import fs from 'fs-extra'
import os from 'os'

export const exec = (command, options, cb) => {
    command = {
        cmd: '',
        args: [],
        ...command || {}
    }
    cb = cb || function() {}

    const temp = `${os.homedir()}/.ambient/.temp.${command.cmd}~`
    fs.writeFileSync(temp, `${command.cmd} $*`)

    const _process = spawn('sh', [temp, ...command.args], {
        stdio: 'inherit',
        ...options
    })

    _process.on('close', cb)
    return _process
}