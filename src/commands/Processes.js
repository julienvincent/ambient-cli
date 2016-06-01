import { command, option } from 'cli-core'
import _ from 'lodash'
import { findDir, useDefault, getLocationInformation } from '../utils'
import { spawn, stop as stopProcess } from '../ProcessMonitor'

const run = command("run", "run a command at a location",
    () => "Please provide more information",

    command(":name", "name of the location",
        ({name}) => {
            const run = ({name}, cmd) => {

                const locationConfig = getLocationInformation(name)
                let root = locationConfig.root

                let found = false
                _.forEach(locationConfig.commands, (command, name) => {
                    if (name == cmd) {
                        cmd = command
                    }
                })

                if (!found) {
                    _.forEach(locationConfig.scripts, (command, name) => {
                        if (name == cmd) {
                            cmd = `npm run ${name}`
                            root = locationConfig.packageRoot
                        }
                    })
                }

                spawn(name, {
                    cmd,
                    daemon: option('daemon') || option('d') || false,
                    cwd: root
                })
            }

            return {
                action: () => {
                    if (findDir(name)) return 'Please specify a command to run at this location'
                    useDefault(d => run(d, name))
                },
                payload: {
                    location: name,
                    run
                }
            }
        },

        command(":command", "the command to run",
            ({name, data: {location, run}}) => {
                const _location = findDir(location)

                return {
                    action: () => run(_location, name)
                }
            }
        )
    )
)

const interact = command("interact", "interactively run commands at a directory",
    () => {

    },

    command(":name", "name of the directory",
        () => {

        }
    )
)

const stop = command("stop", "stop a daemonized process",
    () => {

        return {
            action: () => useDefault(d => stopProcess({name: d.name}))
        }
    },

    command(":name", "name of the directory it belongs to",
        ({name}) => {
            const location = findDir(name)

            if (location) return stopProcess({name: location.name})
            return stopProcess({pid: name})
        }
    )
)

const restart = command("restart", "restart a daemonized process",
    () => {


    },

    command(":name", "name of the directory it belongs to",
        () => {

        },

        command(":command", "the command to restart",
            () => {

            }
        )
    )
)

export { run, interact, restart, stop }