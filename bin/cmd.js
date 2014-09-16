#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var hyperquest = require('hyperquest');
var concat = require('concat-stream');
var rsa = require('hybrid-rsa-stream');
var level = require('level');
var HOME = process.env.HOME || process.env.USERPROFILE;

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

var db;

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
    db = getDb();
    
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
    db = getDb();
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
    db = getDb();
    
    return db.del(user, function (err) {
        if (err) {
            console.error(err);
            process.exit(12);
        }
        else console.log('removed key for ' + user);
    });
}

//assume the user is decrypting when there is no args,
//but they are piping something in.
if(!argv.decrypt && (argv._.length === 0 && !process.stdin.isTTY))
  argv.decrypt = true

if (argv.decrypt) {
    var keyfile = argv.decrypt;
    if (keyfile === true) {
        keyfile = path.join(
            process.env.HOME || process.env.USERPROFILE,
            '.ssh', 'id_rsa'
        );
    }
    return fs.readFile(keyfile, function (err, privkey) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        process.stdin
            .pipe(rsa.decrypt(privkey, { encoding: argv.encoding }))
            .on('error', onError)
            .pipe(process.stdout)
        ;

        function onError (err) {
            console.error('cipherhub: you tried to decrypt something')
            console.error('           that was not a message for you!')
            throw err
        }
    });
}


if (argv._.length === 0) {
    fs.createReadStream(__dirname + '/usage.txt').pipe(process.stdout);
    return;
}


var user = argv._[0];
db = getDb();
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
            else encrypt();
        });
    }
    else encrypt();
    
    function encrypt () {
        var enc = rsa.encrypt(keys[0], { encoding: argv.encoding });
        process.stdin.pipe(enc).pipe(process.stdout);
        enc.on('end', function () { process.stdout.write('\n') });
    }
});

function keyOf (user, cb) {
    db.get(user, function (err, row) {
        if (err && err.name === 'NotFoundError') {
            if (argv.github === false) {
                cb(null, undefined);
            }
            else githubKeys(user, function (err, keys) {
                cb(err, keys, true);
            })
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

function getDb () {
    mkdirp.sync(path.join(HOME, '.config', 'cipherhub'));
    return level(path.join(HOME, '.config', 'cipherhub', 'keys.db'));
}
