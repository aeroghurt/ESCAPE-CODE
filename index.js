#! /usr/bin/env node

const { timingSafeEqual } = require('crypto');
const { readFileSync } = require('fs');
const inquirer = require('inquirer').default;
const { createSpinner } = require('nanospinner');

const { Server } = require('ssh2');

const chalk = require('./chalk.js');
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

			session.on('shell', async (accept, reject) => {
				const stream = accept();
				const sleep = (ms = 2000) => new Promise(() => setTimeout());

				const rules = () => {
					stream.write(chalk.bgRed(`\r\nDisclaimer: This game may require external tools. Solutions are available in the README but reading before solving is mildly discouraged. Have fun :D\r\n`))
					stream.write(chalk.bgBlue(`\r\nHello, escapist. You are currently in a state of unconsciousness.\r\n`))
					stream.write(chalk.bgBlue(`\r\nDon't worry too much. Open your eyes.\r\n`))
				}
				rules();
				await askOpenEyes();
				async function askOpenEyes() {
					const answer = await inquirer.prompt({
						name: 'question 1',
						type: 'input',
						message: 'Open your eyes? Yes/No/[Fingerprint] /j\n',
						default() {
							return 'No';
						}
					});
					return handleAnswer(answer.response == 'Yes')
				}
				async function handleAnswer(isCorrect) {
					const spinner = createSpinner('... Waiting for response.').start();
					await sleep();

					if (isCorrect) {
						spinner.success({ text: `Good. Moving on to the next level...` });
					} else {
						spinner.error( { text: `Goodbye.`});
						process.exit(1);
					}
				}
			});

			// reprint stuff when terminal window size changes
			process.on('SIGWINCH', () => {
				console.log("terminal resized")
			})
		});
	}).on('close', () => {
		console.log('Client disconnected');
	});
}).listen(1234, '127.0.0.1', function () {
	console.log('Listening on port ' + this.address().port);
});
