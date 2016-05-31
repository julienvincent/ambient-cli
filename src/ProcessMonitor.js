import { exec } from './exec'
import _ from 'lodash'
import path from 'path'
import os from 'os'
import fs from 'fs-extra'

const isRunning = pid => {
    try {
        process.kill(pid, 0)
        return true
    } catch (e) {
        return false
    }
}

const getProcesses = () => {
    try {
        return _.map(fs.readdirSync(path.join(os.homedir(), '.ambient/processes')),
            _process => fs.readJsonSync(path.join(os.homedir(), '.ambient/processes', _process), {throws: false}))
    } catch (e) {
        return null
    }
}

export const findProcess = name => {
    const processes = getProcesses()

    if (processes) {
        const _process = _.find(processes, _process => _process.name == name)
        if (_process) {
            _process._isRunning = isRunning(_process.pid)

            return _process
        }

        return false
    }

    return false
}

export const spawn = (name, opts) => {
    const processName = `${name}-${_.random(10000000, 99999999)}`

    const conf = {
        name,
        maxAttempts: 10,
        sleepTime: 3000,
        onAttempt: 1,
        failing: false,
        didExit: false,
        killSignal: 'SIGTERM',
        daemon: false,
        cwd: process.cwd(),
        logFile: path.join(os.homedir(), `.ambient/logs/${processName}.log`),
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
    fs.ensureDirSync(path.join(os.homedir(), '.ambient/logs'))
    if (conf.daemon) fs.writeFileSync(conf.logFile, `\n${Date()}\n\n`, {flag: 'a'})
    const logs = fs.openSync(conf.logFile, 'a')

    const storeProcess = () => {
        try {
            fs.outputJsonSync(path.join(os.homedir(), `.ambient/processes/${processName}.json`), conf)
        } catch (e) {
            console.log("Couldn't write pid file")
            throw e
        }
    }

    // spawn the process
    conf.running = true
    const _process = exec({
        cmd: conf.cmd || 'echo "Nothing to run"',
        args: conf.args || []
    }, {
        detached: conf.detached,
        stdio: conf.daemon ? ['ignore', logs, logs] : 'inherit',
        cwd: conf.cwd,
        killSignal: conf.killSignal
    })
    conf.pid = _process.pid

    _process.on('exit', code => {
        conf.running = false

        if (code !== 0 && conf.daemon) {
            conf.failing = true

            if (conf.onAttempt < conf.maxAttempts) {
                conf.onAttempt += 1

                setTimeout(() => {
                    spawn(name, conf)
                }, conf.sleepTime)
            } else {
                storeProcess()
            }
        } else {
            conf.cleanExit = true
            storeProcess()
        }
    })

    // break process off from parent process. Prevents hanging
    if (conf.daemon) _process.unref()

    // write the process tracker to a file
    storeProcess()
}

export const listRunning = () => _.filter(getProcesses(), ({pid}) => isRunning(pid))