# cipherhub

encrypt messages based on ssh public keys

![cipherhub](http://substack.net/images/cipherhub.png)

It can be frustrating and annoying to communicate with somebody using public key
cryptography since setting up PGP/GPG is a hassle, particularly managing
keyrings and webs of trust.

Luckily, you can fetch the public ssh keys of anybody on github by going to:

```
https://github.com/$USERNAME.keys
```

If you just want to send somebody an encrypted message out of the blue and they
already have a github account with RSA keys uploaded to it, you can just do:

```
cipherhub $USERNAME < secret_message.txt
```

and it will fetch their public keys from github, storing the key locally for
next time.

There is an `openssl rsautl` command to do this but the usage is not
particularly friendly and doesn't keep a keyring around.

# install

With [npm](https://npmjs.org) do:

```
npm install -g cipherhub
```

to get the `cipherhub` command.

# usage

```
cipherhub USERNAME {OPTIONS} < message.txt

  Create an encrypted message for USERNAME on stdin.
 
  If there isn't yet a local key stored for USERNAME, request a key from
  https://github.com/$USERNAME.keys
 
  If there are multiple RSA keys, the operation fails and you will need to
  add the key you want manually with `cipherhub --add`.
  If there are no RSA keys, the command fails with a nonzero exit code.
 
  OPTIONS are:
 
    --no-github     don't request key data from github, just fail
    --no-save       don't automatically save keys fetched from github
    --quiet, -q     suppress extra output
    --encoding, -e  output encoding to use. default: base64

cipherhub --add USERNAME < id_rsa.pub
cipherhub -a USERNAME < id_rsa.pub

  Set the public key for USERNAME from stdin.

cipherhub --remove USERNAME
cipherhub -r USERNAME

  Remove a USERNAME from the local key list.

cipherhub --list
cipherhub -l

  List all the keys in the local key list.

cipherhub --decrypt PRIVKEY {OPTIONS}
cipherhub -d PRIVKEY {OPTIONS}

  Decrypt a message on stdin with an rsa key file PRIVKEY.
  If PRIVKEY isn't specified, only `-d` by itself, cipherhub uses ~/.ssh/id_rsa

  OPTIONS are:

    --encoding, -e  input encoding. default: base64

```

# crazy ideas

You can create
[private github issues](https://github.com/isaacs/github/issues/37)
by just encrypting your message with the maintainer's public key and posting the
issue with the ciphertext.

# caveat npmtor

github's servers can be compromised by a court order, intruder, or employee. You
should use a secondary means of verification to check all the keys fetched from
github where secrecy from courts, intruders, and github employees is of
paramount importance.

# license

MIT
