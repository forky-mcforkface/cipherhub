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
        r: [ 'rm', 'remove' ]
    }
});

if (argv._.length === 0) {
    fs.createReadStream(__dirname + '/usage.txt').pipe(process.stdout);
    return;
}

keyOf(argv._[0], function (err, keys) {
    if (err) {
        console.error(err);
        return process.exit(10);
    }
    if (!keys || keys.length === 0) {
        console.error(
            'No RSA keys available for the requested user.\n'
            + 'Add a key manually by doing:\n\n'
            + '  cipherhub --add ' + argv._[0] + ' < rsa.pub'
            + '\n'
        );
        return process.exit(20);
    }
    if (keys.length > 1) {
        console.error(
            'Multiple keys available for the user: ' + argv._[0] + ':\n\n'
            + keys.map(function (key) {
                return '  ' + key;
            }).join('\n') + '\n\n'
            + 'Add a key manually by doing:\n\n'
            + ' cipherhub --add ' + argv._[0] + ' <<< KEYDATA\n'
            + '\n'
        );
        return process.exit(21);
    }
    
    var enc = rsa.encrypt(keys[0], { encoding: argv.encoding });
    process.stdin.pipe(enc).pipe(process.stdout);
});

function keyOf (user, cb) {
    db.get(user, function (err, row) {
        if (err.name === 'NotFoundError') {
            if (argv.github === false) {
                cb(null, undefined);
            }
            else githubKeys(user, cb);
        }
        else if (err) cb(err)
        else cb(null, row)
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
