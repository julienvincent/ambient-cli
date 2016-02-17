#!/usr/bin/env node
import { command, option, define, help, init } from './utils'

define(
    command('add', 'Add an ambient environment to list of know environments',
        () => 'A name must be provided',
        command(':name', 'The name of the ambient environment', name => {
            console.log(`wildcard name: ${name}`)
        })
    )
)

init()