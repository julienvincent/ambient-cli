import forever from 'forever'
import { spawn } from 'child_process'
import { getBareOptions } from './core'
import fs from 'fs'
import path from 'path'
import _ from 'lodash'

const monitor = {
    start: (environment, daemon) => {
        process.chdir(environment.path)
        let conf = {
                uid: `_${environment.name}_`,
                args: _.without(getBareOptions(), '-d', '--daemon'),
                max: !daemon ? 1 : 10,
                minUptime: 1000,
                spinSleepTime: 3000,
                killSignal: 'SIGTERM'
            },
            server
        const start = () => {
            if (server) server = path.join(process.cwd(), server)

            if (!daemon) {
                const args = [..._.split(conf.command, " "), ...conf.args]

                spawn(conf.command ? args[0] : 'node', _.filter([server, ..._.without(args, args[0])], arg => arg !== null), {
                    stdio: 'inherit'
                })
            } else {
                if (!server) {
                    const args = [..._.split(conf.command, " "), ...conf.args]
                    conf.command = args[0]
                    server = args[1] || ''
                    conf.args = _.without(args, args[0], args[1] || '', '--daemon', '-d')
                }
                forever.startDaemon(server, conf)
            }
        }

        const findDefault = () => {
            const parseData = data => {
                data = JSON.parse(data)
                server = data.main
                start()
            }
            fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8', (err, data) => {
                if (!err) {
                    parseData(data)
                } else {
                    fs.readFile(path.join(process.cwd(), 'src/package.json'), 'utf8', (err, data) => {
                        if (!err) {
                            process.chdir(path.join(process.cwd(), 'src'))
                            parseData(data)
                        } else {
                            console.log('Could not find package.json in environment. Alternatively you can specify the relative location ' +
                                "of your server with '--server=[dir]', or create a .ambient file in your environments root")
                        }
                    })
                }
            })
        }

        fs.readFile(path.join(process.cwd(), '.ambient'), 'utf8', (err, file) => {
            if (!err) {
                file = JSON.parse(file)
                if (file.command) {
                    conf.command = file.command
                }
                if (file.root) {
                    process.chdir(path.join(process.cwd(), file.root))
                    conf.root = path.join(process.cwd(), file.root)
                }
                if (file.script) {
                    server = file.script
                    start()
                } else if (file.script === false && !daemon) {
                    server = null
                    start()
                } else {
                    findDefault()
                }
            } else {
                findDefault()
            }
        })
    },

    stop: (environment, silent) => {
        const uid = `_${environment.name}_`
        monitor.list(running => {
            if (_.find(running, instance => instance.uid == uid)) {
                forever.stop(uid)
            } else {
                if (!silent) {
                    console.log(`Environment ${environment.name} is not running`)
                }
            }
        })
    },

    stopAll: () => {
        monitor.list(running => {
            if (running.length) {
                forever.stopAll()
            } else {
                console.log('no running processes')
            }
        })
    },

    restart: environment => {
        monitor.stop(environment)
        process.nextTick(() => {
            monitor.start(environment, true)
        })
    },

    list: cb => {
        forever.list(false, (err, running) => {
            if (typeof cb === 'function') {
                cb(_.filter(running, instance => instance.running))
            } else if (cb === 'BYPASS') {
                console.log(running)
            }
        })
    }
}
export default monitor