import { exec } from './exec'
import path from 'path'
import os from 'os'
import fs from 'fs-extra'

export const findProcess = name => {
    try {
        const _process = JSON.parse(fs.readFileSync(path.join(os.homedir(), `.ambient/processes/${name}.json`), 'utf8'))

        try {
            process.kill(_process.pid, 0)
            _process._isRunning = true
        } catch (e) {
            _process._isRunning = false
        }

        return _process
    } catch (e) {
        return false
    }
}

export const spawn = (name, opts) => {
    const conf = {
        name,
        maxAttempts: 10,
        sleepTime: 3000,
        killSignal: 'SIGTERM',
        daemon: false,
        cwd: process.cwd(),
        logDir: path.join(os.homedir(), '.ambient/logs'),
        detached: false,
        ...opts
    }

    // check for old processes
    const oldProcess = findProcess(name)
    if (oldProcess && oldProcess._isRunning) {
        console.log('Process is already running. Stop the old one before running a new process.')
        return false
    }

    // logs
    fs.ensureDirSync(conf.logDir)
    if (conf.daemon) fs.writeFileSync(path.join(conf.logDir, `${name}.log`), `\n${Date()}\n\n`, {flag: 'a'})
    const logs = fs.openSync(path.join(conf.logDir, `${name}.log`), 'a')

    // spawn the process
    const _process = exec({
        cmd: conf.cmd || 'echo "Nothing to run"',
        args: conf.args || []
    }, {
        detached: conf.detached,
        stdio: conf.daemon ? ['ignore', logs, logs] : 'inherit',
        cwd: conf.cwd,
        killSignal: conf.killSignal
    })
    if (conf.daemon) _process.unref()

    // write the process tracker to a file
    try {
        fs.outputJsonSync(path.join(os.homedir(), `.ambient/processes/${name}.json`), {
            ...conf,
            pid: _process.pid
        })
    } catch (e) {
        console.log("Couldn't write pid file")
        throw e
    }
}