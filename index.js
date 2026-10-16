#!/usr/bin/env node

const { timingSafeEqual } = require('crypto');
const { readFileSync } = require('fs');
const process = require('node:process');
const readline = require('readline');

const { Server } = require('ssh2');

const chalk = require('./chalk.js');
const allowedUser = Buffer.from('foo');
const allowedPassword = Buffer.from('bar');

let buffer = '';
let current_commands;
let writeCommandsAllowed = false;

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
				// const sleep = (ms = 2000) => new Promise(() => setTimeout());
				const rl = readline.createInterface({
					input: stream,
					output: stream,
					terminal: true,
				});

				stream.on('data', (data) => {
					if (writeCommandsAllowed) {
						const input = data.toString();

						for (const char of input) {
							if (char === '\n' || char === '\r') {
								const command = buffer.trim().toLowerCase();

								stream.write(`\r\n`);

								if (command) {
									if (current_commands[command]) {
										current_commands[command]();
									} else {
										stream.write(chalk.bgRed(`Unknown command: ${command}\r`));
									}
								}

								buffer = '';

								if (!stream.destroyed) {
									stream.write(chalk.yellow(`\r\n`));
								}

								continue;
							}

							if (char === '\x1b') {
								stream.write(chalk.bgRed(`\r\nHaha you think you're so funny.\r\n`));
								return;
							}

							if (char === '\x7f' || char === '\b') {
								if (buffer.length > 0) {
									buffer = buffer.slice(0, -1);
									stream.write(`\b \b`);
								}
								continue;
							}

							buffer += char;
							// this line was the problem im so mad >:(
							// stream.write(char);
						}
					}
				})

				const intro = () => {
					stream.write(chalk.bgRed(`\r\nDisclaimer: This game may require external tools. Solutions are available in the README but reading before solving is mildly discouraged. Have fun :D\r\n`))
					stream.write(chalk.bgBlue(`\r\nHello, escapist. You are currently in a state of unconsciousness.\r\n`))
					stream.write(chalk.bgBlue(`\r\nDon't worry too much. Open your eyes.\r\n`))
				}
				intro();

				const prologue = () => {
					if (!writeCommandsAllowed) {
						rl.question('\r\nOpen your eyes? (yes/no/[fingerprint]) /j\r\n', (answer) => {
							if (answer === "yes" || answer === "y" || answer === "Yes") {
								level_1();
							} else {
								stream.write(chalk.blue(`\r\nFine.\r\n`));
								process.exit(1);
							}
						})
					}
				}
				prologue();

				const level_1 = () => {
					stream.write(chalk.bgYellow(`\r\nYou are sitting in a white-padded room. You try to remember how you got there, but return empty-handed. In front of you is a table with two things: a ${chalk.red(`sheet of paper`)}`) + chalk.bgYellow(` and a ${chalk.red(`cardboard roll.`)}\r\n`))
					stream.write(`\r\nType:\r\n- 1: to view paper\r\n- 2: to view cardboard roll\r\n- 3: to look around\r\n- 'answer', to prompt you\r\n- 'hint', if you really need it\r\n`)

					current_commands = {
						help() {
							stream.write(`\r\nType:\r\n- 1: to view paper\r\n- 2: to view cardboard roll\r\n- 3: to look around\r\n- 'answer', to prompt you\r\n- 'hint', if you really need it\r\n`);
						},

						1() {
							stream.write(`\rWYRHOSYUIDPSOET\r\n`);
						},

						2() {
							stream.write(`\rHm. Maybe it's not a toilet paper roll, as you'd initially thought. It's a bit longer than your average roll...\r\n`);
						},

						3() {
							stream.write(`\rYou had actually been clenching a now-crumpled strip of paper in your hand. It reads: 'You thought you were the Chosen One?'\r\n`);
						},

						answer() {
							writeCommandsAllowed = false;
							rl.question(`What's your answer?\r\n`, (answer) => {
								if (answer === "WHYDOYOUPERSIST") {
									stream.write(chalk.bgYellow(`\r\nYou hear unlatching. A door that wasn't there before opens before your eyes. Stumbling, you walk over to the next room, terrified but keen to escape.\r`));
									stream.write(chalk.bgYellow(`\r\nThis time, the next door is more obvious. It has an industrial look to it and looks heavy. Next to it is a keypad. You assume that the passcode is 4 digits long. There are words engraved into the steel.`));
									level_2();
								} else {
									stream.write(chalk.blue(`\r\nUnforunately, that was incorrect. Goodbye, escapist.\r\n`));
									stream.write(chalk.bgYellow(`\r\nSomewhere in the room, you hear a high-pitched, fast-paced whirring noise. You feel something caress the nape of your neck before your vision darkens.\r\n`));

									process.exit(1);
								}
							})
						},

						hint() {
							stream.write(`\rcardboard rolls and paper cipher ;)\r\n`)
						},
					}
					writeCommandsAllowed = true;
				}

				const level_2 = () => {
					const image = `
           .......               .......            ...                       .......        
           .......               .......            ...                       .......        
    ...	   .......        ...    .......         ...                    ...   .......        
    ...	   .......        ...    .......         ...                    ...   .......        
...........           ...........            ...........            ...........               
...........           ...........            ...........            ...........               
`;
					stream.write(chalk.white(`\r\n	   ${image.trim().replace(/\n/g, '\r\n')}`));
					stream.write(`\r\nType:\r\n- 1: to view image again\r\n- 'answer', to prompt you\r\n- 'hint'\r\n`)

					current_commands = {
						help() {
							stream.write(`\r\nType:\r\n- 1: to view paper\r\n- 2: to view cardboard roll\r\n- 3: to look around\r\n- 'answer, 'to prompt you\r\n- 'hint', if you really need it\r\n`);
						},

						1() {
							stream.write(`\r${image}\r\n`);
						},

						2() {
							stream.write(`\rHm. Maybe it's not a toilet paper roll, as you'd initially thought. It's a bit longer than your average roll...\r\n`);
						},

						3() {
							stream.write(`\rYou had actually been clenching a now-crumpled strip of paper in your hand. It reads: 'You thought you were the Chosen One?'\r\n`);
						},

						answer() {
							writeCommandsAllowed = false;
							rl.question(`\r\nWhat's your answer?\r\n`, (answer) => {
								if (answer === "WHYDOYOUPERSIST") {
									stream.write(chalk.blue(`\r\nMOving on....\r\n`));
									level_2();
								} else {
									stream.write(chalk.blue(`\r\nUnforunately, that was incorrect. Goodbye, escapist.\r\n`));
									stream.write(chalk.bgYellow(`\r\nSomewhere in the room, you hear a high-pitched, fast-paced whirring noise. You feel something caress the nape of your neck before your vision darkens.\r\n`));
									stream.write(chalk.bgYellow(`\r\nBefore you go unconscious completely, you hear 'Goodbye escapist' one last time.\n\r`));

									process.exit(1);
								}
							})
						},

						hint() {
							stream.write(`\rcardboard rolls and paper cipher ;)\r\n`)
						},
					}
				};
			});

			// reprint stuff when terminal window size changes
			// process.on('SIGWINCH', () => {
			// 	console.log("terminal resized")
			// })
		});
	}).on('close', () => {
		console.log('Client disconnected');
		allowed = false;
	});
}).listen(1234, '127.0.0.1', function () {
	console.log('Listening on port ' + this.address().port);
});
