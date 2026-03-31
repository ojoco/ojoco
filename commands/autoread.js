// ============================================================
//  VANGUARD MD — commands/autoread.js
// ============================================================

const config   = require('../config')
const defaults = require('../defaults')

const VALID = ['off', 'all', 'groups', 'dms']

module.exports = async (ctx) => {
  const { reply, args, isSudo } = ctx
  if (!isSudo) return reply('❌ Owner/sudo only!')

  const scope = args[0]?.toLowerCase()

  if (!scope || !VALID.includes(scope)) {
    const cur = config.autoRead ?? defaults.autoRead ?? 'off'
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 👁️ *AUTO READ*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ 📍 *Current:* ' + cur + '\n' +
      '┃\n' +
      '┃ *Usage:* .autoread <scope>\n' +
      '┃ • off    — disabled\n' +
      '┃ • all    — everywhere\n' +
      '┃ • groups — groups only\n' +
      '┃ • dms    — DMs only\n' +
      '╰───────────────━⊷'
    )
  }

  config.autoRead = scope

  await reply(
    '╭───────────────━⊷\n' +
    '┃ 👁️ *AUTO READ*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    (scope === 'off'
      ? '┃ ❌ *OFF* — Auto read disabled\n'
      : '┃ ✅ *' + scope.toUpperCase() + '* — Reading in ' + scope + '\n') +
    '╰───────────────━⊷'
  )
}
