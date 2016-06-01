var fs = require('fs-extra')
var path = require('path')
var spawn = require('child_process').spawn
var os = require('os')
var _ = require('lodash')

var conf = JSON.parse(process.argv.slice(2)[0])
conf.pid = process.pid
function storeProcess() {
    try {
        fs.outputJsonSync(path.join(os.homedir(), '.ambient/processes/', conf.processName + '.json'), conf)
    } catch (e) {
        console.log("Couldn't write pid file")
        throw e
    }
}

fs.ensureFileSync(conf.logFile)
fs.writeFileSync(conf.logFile, '\n' + Date() + '\n\n', {flag: 'a'})
var logs = fs.openSync(conf.logFile, 'a')

var _process
function _spawn() {
    var temp = path.join(os.homedir(), '.ambient/tmp/.temp-' + _.random(10000000, 99999999) + '~')
    fs.ensureFileSync(temp)
    fs.writeFileSync(temp, conf.cmd + ' $*')

    _process = spawn('sh', [temp, ...conf.args], {
        stdio: ['ignore', logs, logs],
        cwd: conf.cwd,
        killSignal: conf.killSignal
    })
    conf.childPid = _process.pid

    _process.on('exit', function(code) {
        if (code !== 0 && conf.daemon) {
            if (conf.onAttempt < conf.maxAttempts) {
                conf.onAttempt += 1

                setTimeout(_spawn, conf.sleepTime)
            } else {
                conf.didExit = true
                storeProcess()
            }
        } else {
            conf.didExit = true
            storeProcess()
        }
    })

    storeProcess()
    fs.removeSync(temp)
}
_spawn()

function onExit() {
    conf.didExit = true
    storeProcess()
    if (_process) _process.kill()
    process.exit()
}

process.on('exit', onExit)
process.on('SIGINT', onExit)
process.on('SIGTERM', onExit)