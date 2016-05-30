import { define, flags, init, setHelpText } from 'cli-core'

import { add, remove, use } from './commands/DirectoryMutating'
import { list, log } from './commands/Logging'
import { run, interact, restart, stop } from './commands/Processes'
import { install, uninstall } from './commands/Packages'

setHelpText("Ambient cli\n")

define(
    add,
    remove,
    use,

    list,
    log,

    run,
    interact,
    stop,
    restart,

    install,
    uninstall
)

flags(
    ['-a, --alias', 'Set an alias name for the environment'],
    ['-u, --use', 'Set this environment as default.'],
    ['-f, --force', 'Force an action to happen. Commonly used to overwrite an existing environment'],
    ['--dir', 'Explicitly set the root directory of an environment when adding or updating it'],
    ['-l, --logs', 'Directory to store logs when running processes'],
    ['-d, --daemon', 'Start a server as a daemon'],
    ['--no-parse', 'When listing running environments, display a direct listing of running processes'],
    ['--no-save', 'Install a module without saving it'],
    ['--jspm', 'Install a module using jspm instead of npm']
)

init()