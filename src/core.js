import minimist from 'minimist'
import _ from 'lodash'

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
    return _.find(args, (value, key) => key == option) || false
}

export const define = definition => {
    commands = {
        ...commands,
        ...definition
    }

    return commands
}

export const help = () => {
    const listCommands = (chain, commands) => {
        if (typeof chain === 'string' || !chain.length) {
            const list = commands => _.forIn(commands, (value, key) => {
                console.log(` - ${/*key.substring(0, 1) == ':' ? key.substring(1) : */key}\t\t${value.man}`)
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
            if (command.next) {
                run(command.next, command.action(param))
            } else {
                const res = command.action(param)
                if (res) console.log(res)
            }
        }

        run(chain)
    } catch (e) {
        console.log(e)
    }
}