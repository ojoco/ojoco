// ============================================================
//  VANGUARD MD — lib/logger.js 
//  Bright gradient bars + perfect boxes + VANGUARD MD
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
  }).replace(/,/g, '')
}

// Full timestamp like your original screenshot
const fullMessageTime = () => {
  const now = new Date()
  const day = now.toLocaleString('en-US', { weekday: 'long', timeZone: 'Africa/Nairobi' })
  const time = now.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Africa/Nairobi'
  })
  return `${day}, ${time} EAT`
}

// Gradient header printer (exactly like CYPHER-X)
const printVanguardHeader = (leftColor, rightColor) => {
  console.log(
    chalk.hex(leftColor)(']') +
    chalk.hex('#FFD700')(' VANGUARD MD ') +
    chalk.hex(rightColor)('[')
  )
}

const logger = {
  info: (msg) => {
    console.log(chalk.cyan(`[${timestamp()}]`) + chalk.blue(' ℹ️  INFO ') + chalk.white(msg))
  },

  success: (msg) => {
    console.log(chalk.cyan(`[${timestamp()}]`) + chalk.green(' ✅ SUCCESS ') + chalk.greenBright(msg))
  },

  warn: (msg) => {
    console.log(chalk.cyan(`[${timestamp()}]`) + chalk.yellow(' ⚠️  WARN ') + chalk.yellowBright(msg))
  },

  error: (msg) => {
    console.log(chalk.cyan(`[${timestamp()}]`) + chalk.red(' ❌ ERROR ') + chalk.redBright(msg))
  },

  cmd: (msg) => {
    console.log(chalk.cyan(`[${timestamp()}]`) + chalk.magenta(' 📨 CMD ') + chalk.magentaBright(msg))
  },

  debug: (msg) => {
    if (process.env.DEBUG === 'true') {
      console.log(chalk.cyan(`[${timestamp()}]`) + chalk.gray(' 🐛 DEBUG ') + chalk.gray(msg))
    }
  },
    
    group: (msg) => {
    console.log(
      chalk.cyan(`[${timestamp()}]`) +
      chalk.blueBright(' 👥 GROUP ') +
      chalk.white(msg)
    )
  },


  // ── EXACT GRADIENT STYLE YOU WANTED ─────────────────────────────
  message: (data) => {
    const isAudio = data.type === 'audioMessage'

    // Gradient colors (super bright like your goal screenshot)
    const topLeft = isAudio ? '#FFD700' : '#00BFFF'
    const topRight = isAudio ? '#FF0000' : '#00FFAA'
    const bottomLeft = isAudio ? '#BA55D3' : '#00BFFF'
    const bottomRight = isAudio ? '#00BFFF' : '#00FFAA'

    console.log('') // clean spacing

    // Top gradient bar
    console.log(chalk.hex(topLeft)('─'.repeat(15)) + chalk.hex('#FFD700')('─'.repeat(5)) + chalk.hex(topRight)('─'.repeat(15)))

    // Header (exactly like CYPHER-X but VANGUARD MD)
    printVanguardHeader(topLeft, topRight)

    // Message details (exact colors & format from your first screenshot)
    console.log(chalk.yellowBright('>> Sent Time: ') + chalk.white(fullMessageTime()))
    console.log(chalk.yellowBright('>> Message Type: ') + (isAudio ? chalk.magenta('audioMessage') : chalk.cyan('conversation')))
    console.log(chalk.yellowBright('>> Sender: ') + chalk.magenta(data.sender))
    console.log(chalk.yellowBright('>> Name: ') + chalk.yellowBright(data.name || 'Unknown'))
    console.log(chalk.yellowBright('>> Chat ID: ') + chalk.magentaBright(data.chatId))
    console.log(chalk.yellowBright('>> Message: ') + chalk.greenBright(data.message || 'N/A'))

    // Bottom gradient bar
    console.log(chalk.hex(bottomLeft)('─'.repeat(15)) + chalk.hex('#00FFAA')('─'.repeat(5)) + chalk.hex(bottomRight)('─'.repeat(15)) + '\n')
  },

  divider: () => console.log(chalk.gray('━'.repeat(30))),
  banner: () => { /* your original banner stays unchanged */ }
}

module.exports = logger
