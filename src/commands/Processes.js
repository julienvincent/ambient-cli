import { command, option } from 'cli-core'
import fs from 'fs-extra'
import _ from 'lodash'
import os from 'os'
import { findDir } from '../utils'
import { spawn } from '../ProcessMonitor'

const run = command("run", "run a command at a directory",
    () => "Please provide more information",

    command(":name", "name of the directory",
        ({name}) => {
            return {
                action: () => {
                    if (findDir(name)) return 'Please specify a command to run at this directory'


                },
                payload: name
            }
        },

        command(":command", "the command to run",
            ({name, data}) => {
                const directory = findDir(data)

                return {
                    action: () => {
                        spawn(`${data}.${name}`, {
                            cmd: name,
                            daemon: option('daemon') || option('d') || false,
                            cwd: directory.root
                        })
                    }
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

    },

    command(":name", "name of the directory it belongs to",
        () => {

        },

        command(":command", "the command that is running",
            () => {

            }
        )
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