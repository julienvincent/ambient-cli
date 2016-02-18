import forever from 'forever'
import { getBareOptions } from './core'
import fs from 'fs'

export default {
    start: (environment, daemon) => {
        process.chdir(environment.path)
        let data
        const start = () => {
            data = JSON.parse(data)
            let server = `${process.cwd()}/${data.main}`,
                conf = {
                    uid: `${environment.name}-${environment.type}`,
                    args: getBareOptions(),
                    max: !daemon ? 1 : 5
                }

            if (daemon === false) {
                forever.start(server, conf)
            } else {
                forever.startDaemon(server, conf)
            }
        }

        fs.readFile(`${process.cwd()}/package.json`, 'utf8', (err, file) => {
            if (!err) {
                data = file
                start()
            } else {
                fs.readFile(`${process.cwd()}/src/package.json`, 'utf8', (err, file) => {
                    if (!err) {
                        process.chdir(`${process.cwd()}/src`)
                        data = file
                        start()
                    } else {
                        console.log('Could not find package.json in environment. Alternatively you can specify the relative location ' +
                            "of your server with '--server=[dir]'")
                    }
                })
            }
        })
    },

    stop: environment => {

    },

    stopAll: () => {
        forever.stopAll()
    },

    list: cb => {
        forever.list(false, (err, running) => {
            cb(running)
        })
    }
}