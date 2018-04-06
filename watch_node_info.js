const fs = require('fs');

const logfilename = require('os').homedir() + '/Sites/platform/platform/node/logs/info.log';

try {
    fs.open(logfilename, 'r', (err, fd) => {
        if (err) {
            throw err;
        }
        fs.fstat(fd, (err, stats) => {
            if (err) {
                throw err;
            }
            watch(fd, stats.size);
        });
    });
} catch(e) {
    console.error(e);
}

/**
 * Watch log file for changes
 */
function watch(fd, prevSize) {
    const watcher = fs.watch(logfilename, eventtype => {
        if (eventtype !== 'change') {
            return;
        }
        fs.fstat(fd, (err, stats) => {
            if (err) {
                throw err;
            }

            const buffSize = stats.size - prevSize;
            if (buffSize <= 0) {
                return;  
            }

            watcher.close();
            read(fd, prevSize, buffSize);
        });
    });
}

/**
 * Read changes from log file
 */
function read(fd, prevSize, buffSize) {
    fs.read(fd, Buffer.alloc(buffSize), 0, buffSize, prevSize, (err, bytesRead, buffer) => {
        if (err) {
            throw err;
        }

        if (buffer[0] === 0) {
            return read(fd, prevSize, buffSize);
        }

        buffer.toString().trim().split('\n').forEach(printFormatted);
        watch(fd, prevSize + buffSize);
    });
}

/**
 * Parse logfile entries and print them
 */
function printFormatted(raw) {
    try {
        const line = JSON.parse(raw);

        const result = /".*" (\d{3}) \S+ "(.*?)"/.exec(line.message);
        if (result) {
            line.statusCode = result[1];
            line.request_url = result[2];
        } else if (line.message.includes('url: ')) {
            const parts = line.message.split('\n');
            line.request_url = parts[1].match(/url: (.+) /)[1];
            line.statusCode = parts[2].match(/status: (\d+)/)[1];
        }
        
        console.log(line.timestamp,
                    line.statusCode || '---',
                    line.level,
                    line.request_url || line.url || line.slug || line.message || '');
    } catch(e) {
        throw e;
    }
}
