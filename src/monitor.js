import { spawn } from 'child_process'
import os from 'os'
import { getBareOptions } from './core'
import { configManager } from './config-manager'
import fs from 'fs-extra'
import path from 'path'
import _ from 'lodash'

const monitor = {
    getProcess: name => {
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
    },

    createProcess: opts => {
        opts = {
            name: 'ambient-process',
            args: [],
            maxAttempts: 10,
            sleepTime: 3000,
            killSignal: 'SIGTERM',
            command: 'node',
            daemon: false,
            root: process.cwd(),
            _isProcess: true,
            logDir: path.join(os.homedir(), '.ambient/logs'),
            ...opts
        }

        const oldProcess = monitor.getProcess(opts.name)
        if (oldProcess && oldProcess._isRunning) {
            console.log('Process is already running. Stop the old one before running a new process.')
            return false
        }

        fs.ensureDirSync(opts.logDir)
        if (opts.daemon) fs.writeFileSync(path.join(opts.logDir, `${opts.name}.log`), `\n${Date()}\n\n`, {flag: 'a'})
        const logs = fs.openSync(path.join(opts.logDir, `${opts.name}.log`), 'a')

        const _process = spawn(opts.command, [...opts.args, ..._.without(getBareOptions(), '-d', '--daemon')], {
            detached: false,
            cwd: opts.root,
            stdio: opts.daemon ? ['ignore', logs, logs] : 'inherit'
        })
        if (opts.daemon) _process.unref()

        try {
            fs.outputJsonSync(path.join(os.homedir(), `.ambient/processes/${opts.name}.json`), {
                ...opts,
                pid: _process.pid
            })
        } catch (e) {
            console.log(`Couldn't write to pid file: ${e}`)
        }
    },

    start: (environment, daemon, logDir, reuse) => {
        if (environment._isProcess) {
            monitor.createProcess(environment)
        } else {
            if (reuse) {
                const _process = monitor.getProcess(environment.name)

                if (_process) {
                    return monitor.createProcess(_process)
                }
            }

            const locations = configManager().getEnvironmentLocations(environment)
            const args = _.split(locations.ambient.command, ' ')
            const root = locations.primaryRoot

            monitor.createProcess({
                command: args[0] || 'node',
                args: _.filter([locations.script || null, ..._.without(args, args[0])], ...locations.ambient.args, arg => arg !== null),
                name: environment.name,
                root,
                logDir: logDir || (locations.ambient.logs ? path.join(root, locations.ambient.logs) : false) || path.join(os.homedir(), '.ambient/logs'),
                daemon
            })
        }
    },

    stop: (environment, timeout, inherit) => {
        const name = typeof environment == 'object' ? environment.name : environment
        const _process = monitor.getProcess(name)
        timeout = typeof timeout === 'number' ? timeout : 10000

        if (_process && _process._isRunning) {
            process.kill(_process.pid, _process.killSignal)
            const attempts = timeout / 100

            const status = success => {
                success = success || function () {
                    }

                const check = (_process, attempt = 1) => {
                    const state = monitor.getProcess(_process.name)
                    if (state && state._isRunning) {
                        if (attempt < attempts) {
                            setTimeout(() => {
                                check(_process, attempt + 1)
                            }, 100)
                        } else {
                            console.log(`Unable to stop process [${name}] after ${timeout / 1000} seconds`)
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
                status(() => console.log('stopped'))
            }
        } else {
            return false
        }
    },

    stopAll: () => {
        _.forEach(configManager().getConfig().environments, environment => {
            const hasStopped = monitor.stop(environment)
            if (hasStopped) {
                hasStopped(() => console.log(`stopped [${environment.name}] <${hasStopped._process.pid}>`))
            }
        })
    },

    restart: (environment, timeout) => {
        const hasStopped = monitor.stop(environment, timeout, true)
        hasStopped(() => {
            monitor.createProcess(hasStopped._process)
        })
    },

    list: () => {
        try {
            const processes = fs.readdirSync(path.join(os.homedir(), '.ambient/processes'))

            return _.filter(_.map(processes, _process => {
                return monitor.getProcess(_process.replace('.json', ''))
            }), _process => _process._isRunning)
        } catch (e) {
            console.log(`Unable to read dir .ambient/processes: ${e}`)
        }
    }
}
export default monitor