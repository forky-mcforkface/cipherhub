var fs = require('fs');
var crypto = require('crypto');
var ursa = require('ursa');
var toPEM = require('http-signature').sshKeyToPEM;

var pub = toPEM(fs.readFileSync('/home/substack/.ssh/id_rsa.pub', 'utf8'));
var priv = fs.readFileSync('/home/substack/.ssh/id_rsa', 'utf8');

var pubkey = ursa.createPublicKey(pub);
var enc = pubkey.encrypt('beep boop');
var privkey = ursa.createPrivateKey(priv);
console.log(privkey.decrypt(enc).toString('utf8'));
