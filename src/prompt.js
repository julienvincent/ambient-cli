import path from 'path'
import fs from 'fs-extra'
import os from 'os'
import _ from 'lodash'

const prompt = (label, opts, cb) => {
    if (typeof opts === 'function') {
        cb = opts
        opts = {}
    }
    cb = cb || function () {
        }

    try {
        let insert = 0, savedinsert = 0, res, i, savedstr
        const _path = opts.file || path.join(os.homedir(), '.ambient/history')
        fs.ensureFileSync(_path)

        let HIST = fs.readFileSync(_path, 'utf8').split('\n').slice(0, -1);
        HIST = HIST.slice(HIST.length - 1000, HIST.length);

        let ix = HIST.length;

        let history = {
            atStart: function () {
                return ix <= 0;
            },
            atPenultimate: function () {
                return ix === HIST.length - 1;
            },
            pastEnd: function () {
                return ix >= HIST.length;
            },
            atEnd: function () {
                return ix === HIST.length;
            },
            prev: function () {
                return HIST[--ix];
            },
            next: function () {
                return HIST[++ix];
            },
            reset: function () {
                ix = HIST.length;
            },
            push: function (str) {
                if (_.find(HIST, (entry, index) => entry == str && index == HIST.length - 1)) return
                HIST.push(str)
            },
            save: function () {
                fs.writeFileSync(_path, HIST.join('\n') + '\n');
            }
        }
        label = `\x1b[32m${label}\x1b[31m)>\x1b[0m `

        const fd = fs.openSync('/dev/tty', 'rs')

        var wasRaw = process.stdin.isRaw
        if (!wasRaw) {
            process.stdin.setRawMode(true)
        }

        const buffer = new Buffer(3)
        let str = '', char, read

        savedstr = ''

        process.stdout.write(label)

        let cycle = 0
        let prevComplete

        while (true) {
            read = fs.readSync(fd, buffer, 0, 3)
            if (read == 3) {
                switch (buffer.toString()) {
                    case '\u001b[A':
                        if (history.atStart()) break

                        if (history.atEnd()) {
                            savedstr = str
                            savedinsert = insert
                        }
                        str = history.prev()
                        insert = str.length
                        process.stdout.write('\u001b[2K\u001b[0G' + label + str)
                        break
                    case '\u001b[B':
                        if (history.pastEnd()) break

                        if (history.atPenultimate()) {
                            str = savedstr
                            insert = savedinsert
                            history.next()
                        } else {
                            str = history.next()
                            insert = str.length
                        }
                        process.stdout.write('\u001b[2K\u001b[0G' + label + str)
                        break
                    case '\u001b[D':
                        const before = insert;
                        insert = (--insert < 0) ? 0 : insert;
                        if (before - insert)
                            process.stdout.write('\u001b[1D');
                        break;
                    case '\u001b[C':
                        insert = (++insert > str.length) ? str.length : insert;
                        process.stdout.write('\u001b[' + (insert + label.length + 1) + 'G');
                        break;
                }
                continue
            }
            char = buffer[read - 1];

            if (char == 3) {
                process.stdout.write('\n')
                fs.closeSync(fd)
                process.stdin.setRawMode(wasRaw)

                return null
            }

            if (char == 13) {
                fs.closeSync(fd)
                if (!history) break
                if (str.length) history.push(str)
                history.reset()
                break
            }

            if (char == 127) { //backspace
                if (!insert) continue
                str = str.slice(0, insert - 1) + str.slice(insert)
                insert--
                process.stdout.write('\u001b[2D')
            } else {
                if ((char < 32 ) || (char > 126))
                    continue
                str = str.slice(0, insert) + String.fromCharCode(char) + str.slice(insert)
                insert++
            }

            process.stdout.write('\u001b[s')
            if (insert == str.length) {
                process.stdout.write('\u001b[2K\u001b[0G' + label + str)
            } else {
                process.stdout.write('\u001b[2K\u001b[0G' + label + str)
            }
            process.stdout.write('\u001b[u')
            process.stdout.write('\u001b[1C')

        }

        process.stdout.write('\n')
        process.stdin.setRawMode(wasRaw)
        history.save()

        return cb(null, str || '')
    } catch (e) {
        return cb(e)
    }
}
export { prompt as default, prompt }