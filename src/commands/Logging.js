import { command, option } from 'cli-core'
import _ from 'lodash'
import os from 'os'
import { config } from '../config'

import Table from 'cli-table'
const table = new Table({
    chars: {
        'top': '',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        'bottom': '',
        'bottom-mid': '',
        'bottom-left': '',
        'bottom-right': '',
        'left': '',
        'left-mid': '',
        'mid': '',
        'mid-mid': '',
        'right': '',
        'right-mid': '',
        'middle': ''
    },

    head: ["\x1b[1mName", "Alias", "Processes", "Logs", "Root\x1b[0m"]
})

const list = command("list|ls", "list all directories",
    () => {
        const data = _.map(config.directories, ({name, alias, root}) => [
            config.using == name ? `\x1b[32m[\x1b[0m${name}\x1b[32m]\x1b[0m` : name,
            alias || '',
            '',
            '',
            root.replace(os.homedir(), '~')
        ])

        table.push(...data)
        return table.toString()
    }
)

const log = command("logs", "display the logs of a directory",
    () => {

    },

    command("clear", "clear logs",
        () => {

        },

        command(":name", "the name of the directory",
            () => {

            },

            command("all", "clear all commands at this directory",
                () => {

                }
            ),

            command(":command", "the name of the command",
                () => {

                }
            )
        )
    ),

    command(":name", "the name of the directory",
        () => {

        },

        command(":command", "the name of the command",
            () => {

            }
        )
    )
)

export { list, log }