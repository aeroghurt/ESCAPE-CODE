const { timingSafeEqual } = require('crypto');
const { readFileSync } = require('fs');
const { inspect } = require('util');

const { Server } = require('ssh2');

const allowedUser = Buffer.from('foo');
const allowedPassword = Buffer.from('bar');

function checkValue(input, allowed) {
  const autoReject = (input.length !== allowed.length);
  if (autoReject) {
    // Prevent leaking length information by always making a comparison with the
    // same input when lengths don't match what we expect ...
    allowed = input;
  }
  const isMatch = timingSafeEqual(input, allowed);
  return (!autoReject && isMatch);
}

new Server({
  hostKeys: [readFileSync('host.key')]
}, (client) => {
  console.log('Client connected!');

  client.on('authentication', (ctx) => {
    let allowed = true;
    if (!checkValue(Buffer.from(ctx.username), allowedUser))
      allowed = false;

    switch (ctx.method) {
      case 'password':
        if (!checkValue(Buffer.from(ctx.password), allowedPassword))
          return ctx.reject();
        break;
      default:
        return ctx.reject(['password']);
    }

    if (allowed)
      ctx.accept();
    else
      ctx.reject();
    
  }).on('ready', () => {
    console.log('Client authenticated!');

    client.on('session', (accept, reject) => {
      const session = accept();

      session.once('pty', (accept, reject, info) => {
        if (accept) accept;
      })

      session.on('shell', (accept, reject) => {
        if (!accept) return;
        const stream = accept();
        stream.write('Just kidding about the errors!\n');
        stream.exit(0);
        stream.end();
      });
    });
  }).on('close', () => {
    console.log('Client disconnected');
  });
}).listen(2222, '127.0.0.1', function() {
  console.log('Listening on port ' + this.address().port);
});
