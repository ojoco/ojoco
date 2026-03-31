// ============================================================
//  VANGUARD MD — lib/logger.js
//  Rich Console Logging with colors, icons, timestamps
// ============================================================

const chalk = require('chalk')

const timestamp = () => {
  return new Date().toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    hour12: true,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const logger = {
  info: (msg) => {
    console.log(
      chalk.cyan(`[${timestamp()}]`) +
      chalk.blue(' ℹ️  INFO ') +
      chalk.white(msg)
    )
  },

  success: (msg) => {
    console.log(
      chalk.cyan(`[${timestamp()}]`) +
      chalk.green(' ✅ SUCCESS ') +
      chalk.greenBright(msg)
    )
  },

  warn: (msg) => {
    console.log(
      chalk.cyan(`[${timestamp()}]`) +
      chalk.yellow(' ⚠️  WARN ') +
      chalk.yellowBright(msg)
    )
  },

  error: (msg) => {
    console.log(
      chalk.cyan(`[${timestamp()}]`) +
      chalk.red(' ❌ ERROR ') +
      chalk.redBright(msg)
    )
  },

  cmd: (msg) => {
    console.log(
      chalk.cyan(`[${timestamp()}]`) +
      chalk.magenta(' 📨 CMD ') +
      chalk.magentaBright(msg)
    )
  },

  debug: (msg) => {
    if (process.env.DEBUG === 'true') {
      console.log(
        chalk.cyan(`[${timestamp()}]`) +
        chalk.gray(' 🐛 DEBUG ') +
        chalk.gray(msg)
      )
    }
  },

  group: (msg) => {
    console.log(
      chalk.cyan(`[${timestamp()}]`) +
      chalk.blueBright(' 👥 GROUP ') +
      chalk.white(msg)
    )
  },

  status: (msg) => {
    console.log(
      chalk.cyan(`[${timestamp()}]`) +
      chalk.greenBright(' 📸 STATUS ') +
      chalk.white(msg)
    )
  },

  economy: (msg) => {
    console.log(
      chalk.cyan(`[${timestamp()}]`) +
      chalk.yellow(' 💰 ECONOMY ') +
      chalk.white(msg)
    )
  },

  divider: () => {
    console.log(chalk.gray('━'.repeat(60)))
  },

  banner: () => {
    console.log(chalk.greenBright(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ██╗   ██╗ █████╗ ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ 
   ██║   ██║██╔══██╗████╗  ██║██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗
   ██║   ██║███████║██╔██╗ ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║
   ╚██╗ ██╔╝██╔══██║██║╚██╗██║██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║
    ╚████╔╝ ██║  ██║██║ ╚████║╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝
     ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          🤖 VANGUARD MD — WhatsApp Bot by Baileys
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `))
  }
}

module.exports = logger
