// ============================================================
//  VANGUARD MD — commands/device.js
// ============================================================

const os      = require('os')
const config   = require('../config')
const defaults = require('../defaults')

module.exports = async (ctx) => {
  const { reply, sock } = ctx

  const botJid        = sock.user?.id || 'Unknown'
  const botName       = sock.user?.name || config.botName || defaults.botName
  const platform      = os.platform()
  const arch          = os.arch()
  const nodeVersion   = process.version
  const baileysVersion = require('@whiskeysockets/baileys/package.json').version

  await reply(
    '╭───────────────━⊷\n' +
    '┃ 📱 *DEVICE INFO*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    '┃ 🤖 *Bot Name:* ' + botName + '\n' +
    '┃ 📞 *Bot JID:* ' + botJid + '\n' +
    '┃\n' +
    '┃ 🖥️ *Runtime*\n' +
    '┃ • OS: ' + platform + ' (' + arch + ')\n' +
    '┃ • Node.js: ' + nodeVersion + '\n' +
    '┃ • Baileys: v' + baileysVersion + '\n' +
    '┃\n' +
    '┃ 🌐 *Browser Tag:* VANGUARD MD — Chrome\n' +
    '╰───────────────━⊷'
  )
}
