// ============================================================
//  VANGUARD MD — commands/antiedit.js
// ============================================================

const config = require('../config')

module.exports = async (ctx) => {
  const { reply, args, isSudo } = ctx
  if (!isSudo) return reply('❌ Only sudo/owner can use this command!')

  const state = args[0]?.toLowerCase()
  if (!state || !['on', 'off'].includes(state)) {
    return reply(
      '╭───────────────━⊷\n' +
      '┃ ✏️ *ANTI EDIT*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ ❌ Usage: *.antiedit on/off*\n' +
      '┃ 📍 *Current:* ' + (config.antiedit ? 'ON' : 'OFF') + '\n' +
      '╰───────────────━⊷'
    )
  }

  config.antiedit = state === 'on'

  await reply(
    '╭───────────────━⊷\n' +
    '┃ ✏️ *ANTI EDIT*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    (config.antiedit
      ? '┃ ✅ *ON* — Edited messages forwarded to owner with original\n'
      : '┃ ❌ *OFF* — Edited messages will be ignored\n') +
    '╰───────────────━⊷'
  )
}
