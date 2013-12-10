#!/usr/bin/env node

var path = require('path');
var mkdirp = require('mkdirp');
var level = require('level');
var hyperquest = require('hyperquest');
var concat = require('concat-stream');

var HOME = process.env.HOME || process.env.USERPROFILE;
mkdirp.sync(path.join(HOME, '.config', 'cipherhub'));
var db = level(path.join(HOME, '.config', 'cipherhub', 'keys.db'));

var minimist = require('minimist');
var argv = minimist(process.argv.slice(2));

if (argv._.length === 0) {
    fs.createReadStream(__dirname + '/usage.txt').pipe(process.stdout);
    return;
}

keyOf(argv._[0], function (err, key) {
    console.log(err, key);
});

function keyOf (user, cb) {
    db.get(user, function (err, row) {
        if (err.name === 'NotFoundError') {
            githubKey(user, cb);
        }
        else if (err) cb(err)
        else cb(row)
    });
}

function githubKey (user, cb) {
    var u = 'https://github.com/' + user + '.keys';
    var hq = hyperquest(u);
    hq.on('error', cb);
    hq.pipe(concat(function (body) {
        var lines = body.toString().split(/\r?\n/);
        var keys = lines.map(function (s) { return s.trim() });
        console.log(keys);
    }));
}
