# cipherhub

encrypt messages based on ssh public keys

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

Just paste the base64-encoded output of the `cipherhub` command into any
existing communication channel: email, irc, web chat, twitter.

# crazy ideas

If you want to talk to somebody

One frustrating thing about PGP/GPG is that if you want to communicate 

There is an `openssl rsautl` command to do this but the usage is not
particularly friendly.

# caveat npmtor

github's servers can be compromised by a court order, intruder, or employee. You
should use a secondary means of verification to check all the keys fetched from
github where secrecy from courts, intruders, and github employees is of
paramount importance.
