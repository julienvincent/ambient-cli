import minimist from 'minimist'
import _ from 'lodash'
import logger from './logger'

_.extractObject = array => {
    let result = {}
    _.forEach(array, command => result = {
        ...result,
        ...command
    })

    return result
}

export const args = minimist(process.argv.slice(2))

let sequence = args._
let found = []
let commands = {}
let availableFlags = []

export const command = (name, man, action, ...chained) => {
    man = man || ''
    action = action || function () {
        }
    if (typeof action === 'object') {
        chained = [...chained, ...[action]]
        action = function () {
        }
    }

    if (typeof man === 'function') {
        action = man
        man = ''
    }

    return {
        [name]: {
            man: man,
            action: action,
            commands: _.extractObject(chained)
        }
    }
}

export const option = option => {
    return _.find(args, (value, key) => key == option)
}

export const getBareOptions = () => {
    return _.filter(process.argv, argument => argument.substring(0, 2) == '--')
}

export const define = definition => {
    commands = {
        ...commands,
        ...definition
    }

    return commands
}

/**
 * A hack to let help know what options are available
 */
export const flags = (...flags) => availableFlags.push(...flags)

export const help = () => {
    const createdChain = []
    const listCommands = (chain, commands) => {
        if (typeof chain === 'string' || !chain.length) {
            const list = (commands, final) => _.forIn(commands, (value, key) => {
                createdChain.push([` - ${key}`, value.man])
            })

            if (!chain.length) {
                list(commands)
            } else {
                list(commands[chain].commands)
            }
        } else {
            const nextInChain = chain[0]
            const command = _.find(commands, (value, key) => key == nextInChain)

            if (command) {
                if (chain.length == 2) {
                    listCommands(chain[1], command.commands)
                } else {
                    listCommands(_.without(chain, nextInChain), command.commands)
                }
            } else {
                console.log(`\nError: Unknown command ${nextInChain}`)
            }
        }
    }

    console.log('CLI tool for interacting with ambient environments.\n')

    console.log('Usage:')
    console.log("ambient [command] --flags\n")

    if (!found.length) {
        console.log('Available commands:')
    } else {
        console.log(`Available commands for ${found[found.length - 1]}:`)
    }
    listCommands(found, commands)

    logger(['', ''])(...createdChain)

    if (availableFlags.length) {
        console.log('\nAvailable flags:')
        logger(['', ''])(...availableFlags)
    }
}

const nextCommand = (commands, index = 0) => {
    if (!sequence.length || option('h') || option('help')) {
        if (sequence[index]) {
            found.push(sequence[index])
        }

        return {
            action: help,
            next: null
        }
    } else {
        const command = _.find(commands, (value, key) => key == sequence[index] || key.substring(0, 1) == ':')

        if (command) {
            found.push(sequence[index])
            index++

            return {
                action: command.action.bind(this, sequence[index - 1]),
                next: !_.isEmpty(command.commands) && sequence.length == index + 1 ? nextCommand(command.commands, index) : null
            }
        } else {
            throw new Error(`Unknown command ${sequence[index]}`)
        }
    }
}

export const init = () => {
    try {
        const chain = nextCommand(commands)
        const difference = _.difference(sequence, found)

        if (difference.length) {
            throw new Error(`Unknown command ${difference[0]}`)
        }

        const run = (command, param) => {
            const res = command.action(param)
            let payload = res,
                log = res

            if (typeof res === 'object') {
                payload = res.payload
                log = res.log
            }

            if (command.next) {
                run(command.next, payload)
            } else {
                if (log) {
                    if (typeof log === 'function') {
                        log()
                    } else {
                        console.log(log)
                    }
                }
            }
        }

        run(chain)
    } catch (e) {
        console.log(e)
    }
}