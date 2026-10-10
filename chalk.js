module.exports = {
    reset: (text) => `\x1b[0m${text}\x1b[0m`,

    bold: (text) => `\x1b[1m${text}\x1b[0m`,
    dim: (text) => `\x1b[2m${text}\x1b[0m`,
    italic: (text) => `\x1b[3m${text}\x1b[0m`,
    underline: (text) => `\x1b[4m${text}\x1b[0m`,

    black: (text) => `\x1b[30m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    magenta: (text) => `\x1b[35m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    white: (text) => `\x1b[37m${text}\x1b[0m`,

    brightBlack: (text) => `\x1b[90m${text}\x1b[0m`,
    brightRed: (text) => `\x1b[91m${text}\x1b[0m`,
    brightGreen: (text) => `\x1b[92m${text}\x1b[0m`,
    brightYellow: (text) => `\x1b[93m${text}\x1b[0m`,
    brightBlue: (text) => `\x1b[94m${text}\x1b[0m`,
    brightMagenta: (text) => `\x1b[95m${text}\x1b[0m`,
    brightCyan: (text) => `\x1b[96m${text}\x1b[0m`,
    brightWhite: (text) => `\x1b[97m${text}\x1b[0m`,

    bgBlack: (text) => `\x1b[40m${text}\x1b[0m`,
    bgRed: (text) => `\x1b[41m${text}\x1b[0m`,
    bgGreen: (text) => `\x1b[42m${text}\x1b[0m`,
    bgYellow: (text) => `\x1b[43m${text}\x1b[0m`,
    bgBlue: (text) => `\x1b[44m${text}\x1b[0m`,
    bgMagenta: (text) => `\x1b[45m${text}\x1b[0m`,
    bgCyan: (text) => `\x1b[46m${text}\x1b[0m`,
    bgWhite: (text) => `\x1b[47m${text}\x1b[0m`,

    clearScreen: () => '\x1b[2J\x1b[H',
    clearLine: () => '\x1b[2K',
    home: () => '\x1b[H',
    up: (n = 1) => `\x1b[${n}A`,
    down: (n = 1) => `\x1b[${n}B`,
    forward: (n = 1) => `\x1b[${n}C`,
    back: (n = 1) => `\x1b[${n}D`,
    goTo: (row, col) => `\x1b[${row};${col}H`
};