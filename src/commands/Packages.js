import { command, option } from 'cli-core'
import fs from 'fs-extra'
import _ from 'lodash'
import os from 'os'
import { add as addDir, findDir, use as useDir, config } from '../config'

const install = command("install|i", "install a package at a directory",
    () => {

    },

    command(":name", "the name of the directory",
        () => {

        },

        command(":package", "the name of the package",
            () => {

            }
        )
    )
)

const uninstall = command("uninstall", "uninstall a package at a directory",
    () => {

    },

    command(":name", "the name of the directory",
        () => {

        },

        command(":package", "the name of the package",
            () => {

            }
        )
    )
)

export { install, uninstall }