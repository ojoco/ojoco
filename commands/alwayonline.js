// ============================================================
//  VANGUARD MD — commands/alwaysonline.js
// ============================================================

const config   = require('../config')
const defaults = require('../defaults')

module.exports = async (ctx) => {
  const { reply, args, isSudo } = ctx
  if (!isSudo) return reply('❌ Owner/sudo only!')

  const state = args[0]?.toLowerCase()

  if (!state || !['on', 'off'].includes(state)) {
    const cur = config.alwaysOnline ?? defaults.alwaysOnline ?? false
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 🟢 *ALWAYS ONLINE*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ 📍 *Current:* ' + (cur ? 'ON ✅' : 'OFF ❌') + '\n' +
      '┃\n' +
      '┃ *Usage:* .alwaysonline on/off\n' +
      '┃\n' +
      '┃ _ON  = always shows online_\n' +
      '┃ _OFF = real last seen restored_\n' +
      '╰───────────────━⊷'
    )
  }

  config.alwaysOnline = state === 'on'

  await reply(
    '╭───────────────━⊷\n' +
    '┃ 🟢 *ALWAYS ONLINE*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    (config.alwaysOnline
      ? '┃ ✅ *ON* — Always showing online\n'
      : '┃ ❌ *OFF* — Real last seen restored\n' +
        '┃ _Restart to fully apply last seen_\n') +
    '╰───────────────━⊷'
  )
}
