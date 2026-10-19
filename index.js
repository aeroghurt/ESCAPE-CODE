#!/usr/bin/env node
// problem: only one player can log in at a time.
// ssh escapist@2a01:4f9:3a:276e::1342 -p 1
const { timingSafeEqual } = require('crypto');
const { readFileSync } = require('fs');
const process = require('node:process');
const readline = require('readline');

const { Server } = require('ssh2');

const chalk = require('./chalk.js');
const allowedUser = Buffer.from('escapist');
const allowedPassword = Buffer.from('goodbye world');

let buffer = '';
let current_commands;
let writeCommandsAllowed = false;
let fingerprintAgreed = false;
let eyescanAgreed = false;
let hasWalkedIntoRoom3Already = false;

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
				const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
								stream.write(chalk.bgRed(`\r\nNope.\r\n`));
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
						}
					}
				})

				const progress_bar = async () => {
					const width = process.stdout.columns;
					let filled = `█`;
					let remaining = `/`;
					for (let i = 0; i <= width; i++) {
						stream.write(chalk.green(`${filled.repeat(i)}${remaining.repeat(width - i)}`));
						await sleep(20);
						stream.write(chalk.green(`\r\x1b[K`));
					}
				}

				const typewriterEffect = async (sentence) => {
					let line = [];
					for (const char in sentence) {
						line.push(sentence[char]);
						stream.write(chalk.blue(`${line.join("")}`));
						await sleep(100);
						stream.write(`\r\x1b[K`);
					}
					stream.write(chalk.bgBlue(sentence))
				}

				const intro = async () => {
					const banner = `
////////////////////////////////////////////////////
//███████╗███████╗░██████╗░█████╗░██████╗░███████╗//
//██╔════╝██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝//
//█████╗░░███████╗██║░░░░░███████║██████╔╝█████╗░░//
//██╔══╝░░╚════██║██║░░░░░██╔══██║██╔═══╝░██╔══╝░░//
//███████╗███████║╚██████╗██║░░██║██║░░░░░███████╗//
//╚══════╝╚══════╝░╚═════╝╚═╝░░╚═╝╚═╝░░░░░╚══════╝//
//░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░//
//░██████╗░██████╗░██████╗░███████╗░░░░░░░░░░░░░░░//
//██╔════╝██╔═══██╗██╔══██╗██╔════╝░░░░░░░░░░░░░░░//
//██║░░░░░██║░░░██║██║░░██║█████╗░░░░░░░░░░░░░░░░░//
//██║░░░░░██║░░░██║██║░░██║██╔══╝░░░░░░░░░░░░░░░░░//
//╚██████╗╚██████╔╝██████╔╝███████╗░░░░░░░░░░░░░░░//
//░╚═════╝░╚═════╝░╚═════╝░╚══════╝░░░░░░░░░░░░░░░//
////////////////////////////////////////////////////
`
					stream.write(chalk.green(`\r\n${banner.trim().replace(/\n/g, '\r\n')}`));
					stream.write(chalk.bgRed(`\r\nDisclaimer: This game may require external tools, and the width of your terminal needs to be at least 94 to display things properly. Solutions are available in DONTREADME.md but reading before solving is mildly discouraged. Have fun :D\r\n`))
					stream.write(chalk.bgBlue(`\r\nHello, escapist. You are currently in a state of unconsciousness.\r\n`))
					stream.write(chalk.bgBlue(`\r\nDon't worry too much. Open your eyes.\r\n`))
					await typewriterEffect(`hello world`);
				}
				intro();

				const prologue = () => {
					if (!writeCommandsAllowed) {
						rl.question(chalk.blue('\r\nOpen your eyes? (yes/no/[fingerprint]) /j\r\n'), (answer) => {
							if (answer === "yes" || answer === "y" || answer === "Yes") {
								level_1();
								return;
							} else {
								stream.write(chalk.blue(`\r\nFine.\r\n`));
								process.exit(1);
							}
						})
					}
				}
				prologue();

				const level_1 = async () => {
					await progress_bar();
					const banner = `
//////////////////////////////////////////////////////
//██╗░░░░░███████╗██╗░░░██╗███████╗██╗░░░░░░░░░░██╗░//
//██║░░░░░██╔════╝██║░░░██║██╔════╝██║░░░░░░░░░███║░//
//██║░░░░░█████╗░░██║░░░██║█████╗░░██║░░░░░░░░░╚██║░//
//██║░░░░░██╔══╝░░╚██╗░██╔╝██╔══╝░░██║░░░░░░░░░░██║░//
//███████╗███████╗░╚████╔╝░███████╗███████╗░░░░░██║░//
//╚══════╝╚══════╝░░╚═══╝░░╚══════╝╚══════╝░░░░░╚═╝░//
//////////////////////////////////////////////////////
`
					stream.write(chalk.white(`\r\n${banner.trim().replace(/\n/g, '\r\n')}`));
					stream.write(chalk.bgYellow(`\r\nYou are sitting in a white-padded room. You try to remember how you got there, but return empty-handed. In front of you is a table with two things: a ${chalk.red(`sheet of paper`)}`) + chalk.bgYellow(` and a ${chalk.red(`cardboard roll.`)}\r\n`))
					stream.write(`Type:\r\n- 1: to view paper\r\n- 2: to view cardboard roll\r\n- 3: to look around\r\n- 'answer', to prompt you\r\n- 'hint', if you really need it\r\n`)

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
							rl.question(chalk.blue(`What's your answer?`), (answer) => {
								if (answer === "WHYDOYOUPERSIST") {
									stream.write(chalk.bgYellow(`\r\nYou hear unlatching. A door that wasn't there before opens before your eyes. Stumbling, you walk over to the next room, terrified but keen to escape.\r`));
									stream.write(chalk.bgYellow(`\r\nThis time, the next door is more obvious. It has an industrial look to it and looks heavy. Next to it is a keypad. You assume that the passcode is 4 digits long. There are words engraved into the steel.`));
									level_2();
									return;
								} else {
									death(1);
								}
							})
						},

						hint() {
							stream.write(`\rcardboard rolls and paper cipher ;)\r\n`)
						},
					}
					writeCommandsAllowed = true;
				}

				const level_2 = async () => {
					const image = `
           .......               .......            ...                       .......        
           .......               .......            ...                       .......        
    ...	   .......        ...    .......         ...                    ...   .......        
    ...	   .......        ...    .......         ...                    ...   .......        
...........           ...........            ...........            ...........               
...........           ...........            ...........            ...........               
`;
					const banner = `
//////////////////////////////////////////////////////////
//██╗░░░░░███████╗██╗░░░██╗███████╗██╗░░░░░░░░░██████╗░░//
//██║░░░░░██╔════╝██║░░░██║██╔════╝██║░░░░░░░░░╚════██╗░//
//██║░░░░░█████╗░░██║░░░██║█████╗░░██║░░░░░░░░░░█████╔╝░//
//██║░░░░░██╔══╝░░╚██╗░██╔╝██╔══╝░░██║░░░░░░░░░██╔═══╝░░//
//███████╗███████╗░╚████╔╝░███████╗███████╗░░░░███████╗░//
//╚══════╝╚══════╝░░╚═══╝░░╚══════╝╚══════╝░░░░╚══════╝░//
//////////////////////////////////////////////////////////
`
					stream.write(chalk.white(`\r\n${banner.trim().replace(/\n/g, '\r\n')}`));
					stream.write(chalk.white(`\r\n	   ${image.trim().replace(/\n/g, '\r\n')}`));
					stream.write(chalk.blue(`\r\nA: 7641\r\nB: 6698\r\nC: 1720\r\nD: 2153\r\n`));
					stream.write(chalk.white(`\r\n\x1b[3mBlind, you are, yet still looking for something.\x1b[0m`));
					stream.write(`\r\nType:\r\n- 1: to view image again\r\n- 2: to touch the door\r\n- 'answer', to prompt you\r\n- 'hint', for a hint\r\n`)

					current_commands = {
						help() {
							stream.write(`\r\nType:\r\n- 1: to view image again\r\n- 'answer', to prompt you\r\n- 'hint'\r\n`)
						},

						1() {
							stream.write(chalk.white(`\r\n	   ${image.trim().replace(/\n/g, '\r\n')}`));
						},

						2() {
							stream.write(`\r\nYou run your fingers across the dots etched into the door. After a long time of feeling nothing, this sensory experience feels weird, yet oddly nice.\r\n`)
						},

						answer() {
							writeCommandsAllowed = false;
							rl.question(chalk.blue(`What's your answer?`), (answer) => {
								if (answer === "B" || answer == "b") {
									level_3();
								} else {
									death(1);
								}
							})
						},

						hint() {
							stream.write(`\rLife is just a game and we are its inhabitants.\r\n`)
						},
					}
					writeCommandsAllowed = true;
				};

				const level_3 = async () => {
					if (fingerprintAgreed && eyescanAgreed) {
						level_4();
						return;
					}

					const banner = `
//////////////////////////////////////////////////////////
//██╗░░░░░███████╗██╗░░░██╗███████╗██╗░░░░░░░░░██████╗░░//
//██║░░░░░██╔════╝██║░░░██║██╔════╝██║░░░░░░░░░╚════██╗░//
//██║░░░░░█████╗░░██║░░░██║█████╗░░██║░░░░░░░░░░█████╔╝░//
//██║░░░░░██╔══╝░░╚██╗░██╔╝██╔══╝░░██║░░░░░░░░░░╚═══██╗░//
//███████╗███████╗░╚████╔╝░███████╗███████╗░░░░██████╔╝░//
//╚══════╝╚══════╝░░╚═══╝░░╚══════╝╚══════╝░░░░╚═════╝░░//
//////////////////////////////////////////////////////////
`

					if (!hasWalkedIntoRoom3Already) {
						stream.write(chalk.white(`\r\n${banner.trim().replace(/\n/g, '\r\n')}`));
						stream.write(chalk.bgYellow(`\r\nA fingerprint reader and an iris scanner. Those two seem to be the only thing in the world that matter right now. Without skipping a beat, you walk over to it clumsily, hungrily.\r\n`));
					}

					stream.write(`\r\nType:\r\n- 1: look around\r\n- 2: fingerprint scanner\r\n- 3: iris scanner\r\n`);

					current_commands = {
						help() {
							stream.write(`\r\nType:\r\n- 1: look around\r\n- 2: fingerprint scanner\r\n- 3: iris scanner\r\n- 4: hint`);
						},

						2() {
							writeCommandsAllowed = false;
							if (fingerprintAgreed && eyescanAgreed) {
								level_4();
							} else {
								rl.question(chalk.blue(`Put thumb onto fingerprint reader? (yes/no)\r\n`), (answer) => {
									stream.write(chalk.red(`\x1bAre you quite sure about this?\x1b[0m`));
									if (answer === 'yes' || answer === 'y') {
										fingerprintAgreed = true;
										level_3();
										return;
									} else {
										death(2);
									}
								})
							}
						},

						3() {
							writeCommandsAllowed = false;
							if (fingerprintAgreed && eyescanAgreed) {
								level_4();
							} else {
								rl.question(chalk.blue(`Scan your irises? (yes/no)\r\n`), (answer) => {
									stream.write(chalk.red(`\x1bAre you quite sure about this?\x1b[0m`));
									if (answer === 'yes' || answer === 'y') {
										eyescanAgreed = true;
										level_3();
										return;
									} else {
										death(2);
									}
								})
							}
						},

						1() {
							stream.write(`\rThere is nothing else but the small patch of grass beneath your feet, stretching beyond the imposing doors. Maybe it's waiting for you outside.\r\n`);
						},

						hint() {
							stream.write(`\rNo hints available for this level. Choose wisely.\r\n`);
						},
					}
					writeCommandsAllowed = true;
				};

				const level_4 = async () => {
					stream.write(chalk.bgYellow(`\r\n\x1bWell, there's no turning back now.\x1b[0m\r\n`))
					let line_number = 0;
					const banner = `
//////////////////////////////////////////////////////////
//██╗░░░░░███████╗██╗░░░██╗███████╗██╗░░░░░░░░░██╗░░██╗░//
//██║░░░░░██╔════╝██║░░░██║██╔════╝██║░░░░░░░░░██║░░██║░//
//██║░░░░░█████╗░░██║░░░██║█████╗░░██║░░░░░░░░░███████║░//
//██║░░░░░██╔══╝░░╚██╗░██╔╝██╔══╝░░██║░░░░░░░░░╚════██║░//
//███████╗███████╗░╚████╔╝░███████╗███████╗░░░░░░░░░██║░//
//╚══════╝╚══════╝░░╚═══╝░░╚══════╝╚══════╝░░░░░░░░░╚═╝░//
//////////////////////////////////////////////////////////
`
					const banner1 = `
░█▀▀░█▀▄░█▀▀░█▀▀░█▀▄░█▀█░█▄█░░░▀█▀░█▀▀░░░█▀█░░░█░█░█▀█░█▀█░█░█░░░░
░█▀▀░█▀▄░█▀▀░█▀▀░█░█░█░█░█░█░░░░█░░▀▀█░░░█▀█░░░█▀█░█░█░█▀█░▄▀▄░░░░
░▀░░░▀░▀░▀▀▀░▀▀▀░▀▀░░▀▀▀░▀░▀░░░▀▀▀░▀▀▀░░░▀░▀░░░▀░▀░▀▀▀░▀░▀░▀░▀░▄▀░
`
					const banner2 = `
░█▀▀░█░█░█▀▀░█▀▀░█░█░█▄█░█▀▄░░░▀█▀░█▀█░░░▀█▀░█░█░█▀▀░░░█▀█░█▀▀░█░█
░▀▀█░█░█░█░░░█░░░█░█░█░█░█▀▄░░░░█░░█░█░░░░█░░█▀█░█▀▀░░░█░█░█▀▀░█▄█
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀░░░░░▀░░▀▀▀░░░░▀░░▀░▀░▀▀▀░░░▀░▀░▀▀▀░▀░▀
░█▀█░█▀█░█▀▄░█▀█░█▀▄░▀█▀░█▀▀░█▀▀░░░                               
░█▀▀░█▀█░█▀▄░█▀█░█░█░░█░░▀▀█░█▀▀░░░                               
░▀░░░▀░▀░▀░▀░▀░▀░▀▀░░▀▀▀░▀▀▀░▀▀▀░▀░                               
`
					current_commands = {
						e() {
							return;
						}
					}
					writeCommandsAllowed = true;
					
					stream.write(chalk.white(`\r\n${banner.trim().replace(/\n/g, '\r\n')}`));
					stream.write(chalk.bgBlue(`\r\n${banner1.trim().replace(/\n/g, '\r\n')}`));
					stream.write(chalk.bgBlue(`\r\n${banner2.trim().replace(/\n/g, '\r\n')}`));
					stream.write(`\r\nType e to continue\r\n`);
					stream.write(chalk.bgYellow(`\r\nIt sounds awfully familiar. Against your will, your stomach drops. Familiar enough to have a bodily reaction, unfamiliar enough not to recall anything.\r\n`));
					await sleep(5000);
					stream.write(chalk.bgYellow(`The ground is rumbling.`));
					await sleep(2000);
					stream.write(chalk.bgYellow(`The grass beneath your feet starts to morph into tiles, reflective tiles. For the first time, you finally get to see who you are.\r\nFilthy, worn and torn clothes transform into fresh garments. Your shaggy, self-cut hair turns into a tidy wave, years since the last time it had been.`));
					await sleep(1000);
					stream.write(chalk.bgYellow(`\r\nFilthy, worn and torn clothes transform into fresh garments. Your shaggy, self-cut hair turns into a tidy wave, years since the last time it had been.`));
					await sleep(500);
					stream.write(chalk.bgYellow(`\r\nYour shaggy, self-cut hair turns into a tidy wave, years since the last time it had been.`));
					await typewriterEffect(`\r\nThis, this is everything you've been missing out on.\r\n`);
				};

				const death = (variation) => {
					stream.write(chalk.blue(`\r\nUnforunately, that was incorrect. Goodbye, escapist.\r\n`));
					switch (variation) {
						case 1:
							stream.write(chalk.bgYellow(`\r\nSomewhere in the room, you hear a high-pitched, fast-paced whirring noise. You feel something caress the nape of your neck before your vision darkens.`));
							stream.write(`\r\n`);
							break;
						case 2:
							stream.write(chalk.bgYellow(`\r\nSomething has opened. You hear the gushing of water before you see it.\r\nWithin a mere few seconds, the water level had already reached your ankles.\r\nYou try the fingerprint reader, the iris scanner, desperate. Nothing works.\r\nYour legs, your chest, then your neck. The wait is agonisingly slow, yet excruciatingly fast.\r\nYou turn your head skywards, looking at the artificial heaven above.`));
							stream.write(`\r\n`);
							break;
					}

					stream.exit(0);
					stream.end();
				}
			});
		});
	}).on('close', () => {
		console.log('Client disconnected');
		buffer = '';
		current_commands;
		writeCommandsAllowed = false;
		fingerprintAgreed = false;
		eyescanAgreed = false;
		hasWalkedIntoRoom3Already = false;
	});
}).listen(1, '::', function () {
	console.log('Listening on port ' + this.address().port);
});
