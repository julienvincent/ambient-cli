import { exec, execAndWatch } from './exec'
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

export const findProcesses = name => {
    const processes = getProcesses()

    if (processes) {
        const _processes = _.filter(processes, _process => _process.name == name)
        if (_processes) return _processes

        return false
    }

    return false
}

export const findProcess = pid => {
    const processes = getProcesses()

    if (processes) {
        const _process = _.find(processes, _process => _process.pid == pid || _process.childPid == pid)
        if (_process) return _process

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
        didExit: false,
        killSignal: 'SIGTERM',
        daemon: false,
        cwd: process.cwd(),
        logFile: path.join(os.homedir(), `.ambient/logs/${processName}.log`),
        processName,
        args: [],
        ...opts
    }

    if (conf.daemon) {
        execAndWatch(conf)
    } else {
        exec({
            cmd: conf.cmd || '',
            args: conf.args || []
        }, {
            stdio: 'inherit',
            cwd: conf.cwd,
            killSignal: conf.killSignal
        })
    }
}

export const stop = ({name, pid}, timeout, inherit) => {
    timeout = typeof timeout === 'number' ? timeout : 10000

    const kill = _process => {
        process.kill(-_process.pid, _process.killSignal)

        const attempts = timeout / 100

        const status = success => {
            success = success || function() {
                }

            const check = (_process, attempt = 1) => {
                if (isRunning(_process.pid)) {
                    if (attempt < attempts) {
                        setTimeout(() => {
                            check(_process, attempt + 1)
                        }, 100)
                    } else {
                        console.log(`Unable to stop process [${_process.pid}] after ${timeout / 1000} seconds`)
                    }
                } else {
                    success()
                }
            }
            check(_process)
        }

        if (inherit) {
            status._process = _process
            return status
        } else {
            status(() => console.log(`Stopped process with pid: ${_process.pid}`))
        }
    }

    if (name) {
        _.map(findProcesses(name), p => {
            if (isRunning(p.pid)) {
                kill(p)
            }
        })
    }

    if (pid) {
        const _process = findProcess(pid)
        if (_process && isRunning(pid)) kill(_process)
    }
}

export const restart = () => {

}

export const listRunning = () => _.filter(getProcesses(), ({pid, didExit, onAttempt, maxAttempts}) =>
isRunning(pid) || (!didExit && onAttempt < maxAttempts))