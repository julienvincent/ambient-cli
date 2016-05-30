import { command, option } from 'cli-core'
import fs from 'fs-extra'
import _ from 'lodash'
import os from 'os'
import { add as addDir, findDir, use as useDir, config } from '../config'

const run = command("run", "run a command at a directory",
    () => {

    },

    command(":name", "name of the directory",
        () => {

        },

        command(":command", "the command to run",
            () => {

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