#! /usr/bin/env node

const { timingSafeEqual } = require('crypto');
const { readFileSync } = require('fs');
const readline = require('readline');
const { createSpinner } = require('nanospinner');

const { Server } = require('ssh2');

const chalk = require('./chalk.js');
const allowedUser = Buffer.from('foo');
const allowedPassword = Buffer.from('bar');

let buffer = '';
let allowed = false;

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
				const rl = readline.createInterface({
					input: stream,
					output: stream,
					terminal: true,
				});

				if (allowed) {
					stream.on('data', (data) => {
						if (data.includes('0x03')) {
							stream.exit(0);
							stream.end();
							return;
						}

						const input = data.toString();

						for (const char of input) {
							if (char === '\n' || char === '\r') {
								const command = buffer.trim().toLowerCase();

								stream.write(`\r\n`);

								if (command) {
									if (commands[command]) {
										commands[command]();
									} else {
										stream.write(stream.bgRed(`Unknown command: ${command}\r\n`));
									}
								}

								buffer = '';

								if (!stream.destroyed) {
									stream.write(chalk.yellow(`\r\n`));
								}

								continue;
							}

							if (char === '\x7f' || char === 'b') {
								if (buffer.length > 0) {
									buffer = buffer.slice(0, -1);
									stream.write(`\b \b`);
								}
								continue;
							}

							buffer += char;
							stream.write(char);
							console.log(char);
						}
					})
				}


				const intro = () => {
					stream.write(chalk.bgRed(`\r\nDisclaimer: This game may require external tools. Solutions are available in the README but reading before solving is mildly discouraged. Have fun :D\r\n`))
					stream.write(chalk.bgBlue(`\r\nHello, escapist. You are currently in a state of unconsciousness.\r\n`))
					stream.write(chalk.bgBlue(`\r\nDon't worry too much. Open your eyes.\r\n`))
				}
				intro();

				const prologue = () => {
					allowed = false;
					rl.question('\r\nOpen your eyes? (yes/no/[fingerprint]) /j\r\n', (answer) => {
						if (answer === "yes" || answer === "y" || answer === "Yes") {
							level_1();
						} else {
							stream.write(chalk.blue(`\r\nFine.\r\n`));
							process.exit(1);
						}
					})
				}
				prologue();

				const level_1 = () => {
					
					stream.write(chalk.bgYellow(`\r\nYou are sitting in a white-padded room. You try to remember how you got there, but return empty-handed. In front of you is a table with two things: a ${chalk.red(`sheet of paper`)}`) + chalk.bgYellow(` and a ${chalk.red(`cardboard roll.`)}\r\n`))
					stream.write(`\r\nType:\r\n- 1: to view paper\r\n- 2: to view cardboard roll\r\n- 3: to look around\r\n- 'answer' + your answer, to progress to the next level\r\n- 'hint', if you really need it\r\n`)

					const commands = {
						help() {
							stream.write(`\r\nType:\r\n- 1: to view paper\r\n- 2: to view cardboard roll\r\n- 3: to look around\r\n- 'answer' + your answer, to progress to the next level\r\n- 'hint', if you really need it\r\n`);
						},

						1() {
							stream.write(`\r\nWYRHOSYUIDPSOET\r\n`);
						},

						2() {
							stream.write(`\r\nHm. Maybe it's not a toilet paper roll, as you'd initially thought. It's a bit longer than your average roll...\r\n`);
						},

						3() {
							stream.write(`\r\nYou had actually been clenching a now-crumpled strip of paper in your hand. It reads: 'You thought you were the Chosen One?'\r\n`);
						},

						answer() {
							rl.question(`\r\nWhat's your answer?\r\n`, (answer) => {
								if (answer === "WHYDOYOUPERSIST") {
									rl.close();
									level_2();
								} else {
									stream.write(chalk.blue(`\r\nUnforunately, that was incorrect. Goodbye, escapist.\r\n`));
									stream.write(chalk.bgYellow(`\r\nSomewhere in the room, you hear a high-pitched, fast-paced whirring noise. You feel something caress the nape of your neck before your vision darkens.\r\n`));
									stream.write(chalk.bgYellow(`\r\nBefore you go unconscious completely, you hear 'Goodbye escapist' one last time.\r\n`));

									process.exit(1);
								}
							})
						},

						hint() {
							stream.write(`\r\ncardboard rolls and paper *cipher* ;)\r\n`)
						},
					}
					allowed = true;
				}

				const level_2 = () => {

				}

				// const intermission = () => {
				// 	stream.write(chalk.bgRed(`\r\nYeetus\r\n`))
				// }
				// intermission();
				// await askOpenEyes();

				// async function askOpenEyes() {
				// 	const answer = await input({
				// 		message: 'Open your eyes? Yes/No/[Fingerprint] /j\n',
				// 		default: 'Yes'
				// 	});
				// 	return handleAnswer(answer === 'Yes')
				// }

				// async function handleAnswer(isCorrect) {
				// 	const spinner = createSpinner('... Waiting for response.').start();
				// 	await sleep();

				// 	if (isCorrect) {
				// 		spinner.success({ text: `Good. Moving on to the next level...` });
				// 	} else {
				// 		spinner.error( { text: `Goodbye.`});
				// 		process.exit(1);
				// 	}
				// }
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
