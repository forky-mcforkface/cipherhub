#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var level = require('level');
var hyperquest = require('hyperquest');
var concat = require('concat-stream');
var rsa = require('rsa-stream');

var HOME = process.env.HOME || process.env.USERPROFILE;
mkdirp.sync(path.join(HOME, '.config', 'cipherhub'));
var db = level(path.join(HOME, '.config', 'cipherhub', 'keys.db'));

var minimist = require('minimist');
var argv = minimist(process.argv.slice(2), {
    alias: {
        e: 'encoding',
        d: 'decrypt',
        a: 'add',
        l: [ 'ls', 'list' ],
        r: [ 'rm', 'remove' ],
        q: 'quiet',
        h: 'help'
    },
    'default': {
        encoding: 'base64'
    }
});

if (argv.help) {
    return fs.createReadStream(__dirname + '/usage.txt')
        .pipe(process.stdout)
    ;
}

if (argv.add) {
    var user = argv.add;
    if (user === true) {
        console.error('usage: cipherhub --add USER < id_rsa.pub');
        return process.exit(22);
    }
    
    return process.stdin.pipe(concat(function (body) {
        db.put(user, body.toString('utf8'), function (err) {
            if (err) {
                console.error(err);
                process.exit(11);
            }
            else console.log(
                'added key for', user,
                '(' + body.length + ' bytes)'
            );
        });
    }));
}
if (argv.list) {
    return db.createReadStream().on('data', function (row) {
        console.log(row.key, row.value.trim());
    });
}
if (argv.remove) {
    var user = argv.remove;
    if (user === true) {
        console.error('usage: cipherhub --rm USER');
        return process.exit(23);
    }
    
    return db.del(user, function (err) {
        if (err) {
            console.error(err);
            process.exit(12);
        }
        else console.log('removed key for ' + user);
    });
}
if (argv.decrypt) {
    return console.error('TODO');
}

if (argv._.length === 0) {
    fs.createReadStream(__dirname + '/usage.txt').pipe(process.stdout);
    return;
}

var user = argv._[0];
keyOf(user, function (err, keys, fromGithub) {
    if (err) {
        console.error(err);
        return process.exit(10);
    }
    if (!keys || keys.length === 0) {
        console.error(
            'No RSA keys available for the requested user.\n'
            + 'Add a key manually by doing:\n\n'
            + '  cipherhub --add ' + user + ' < rsa.pub'
            + '\n'
        );
        return process.exit(20);
    }
    if (keys.length > 1) {
        console.error(
            'Multiple keys available for the user: ' + user + ':\n\n'
            + keys.map(function (key) {
                return '  ' + key;
            }).join('\n') + '\n\n'
            + 'Add a key manually by doing:\n\n'
            + ' cipherhub --add ' + user + ' <<< KEYDATA\n'
            + '\n'
        );
        return process.exit(21);
    }
    
    if (fromGithub && argv.save !== false) {
        db.put(user, keys[0], function (err) {
            if (err) {
                console.error('Error saving key for user', user + ':');
                console.error(err);
            }
            else if (!argv.quiet) {
                console.error('# saved new key for user ', user);
                encrypt();
            }
        });
    }
    else encrypt();
    
    function encrypt () {
        var enc = rsa.encrypt(keys[0], { encoding: argv.encoding });
        process.stdin.pipe(enc).pipe(process.stdout);
        process.stdin.on('close', function () {
            console.log();
        });
    }
});

function keyOf (user, cb) {
    db.get(user, function (err, row) {
        if (err && err.name === 'NotFoundError') {
            if (argv.github === false) {
                cb(null, undefined);
            }
            else githubKeys(user, cb, true);
        }
        else if (err) cb(err)
        else cb(null, [row])
    });
}

function githubKeys (user, cb) {
    var u = 'https://github.com/' + user + '.keys';
    var hq = hyperquest(u);
    hq.on('error', function (err) {
        cb(err);
        cb = function () {};
    });
    hq.pipe(concat(function (body) {
        var keys = body.toString().split(/\r?\n/)
            .map(function (key) { return key.trim() })
            .filter(function (key) {
                return /^ssh-rsa\b/.test(key);
            })
        ;
        cb(null, keys);
    }));
}
