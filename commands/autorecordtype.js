// ============================================================
//  VANGUARD MD — commands/autorecordtype.js
// ============================================================

const config   = require('../config')
const defaults = require('../defaults')

const VALID = ['off', 'all', 'groups', 'dms']

module.exports = async (ctx) => {
  const { reply, args, isSudo } = ctx
  if (!isSudo) return reply('❌ Owner/sudo only!')

  const scope = args[0]?.toLowerCase()

  if (!scope || !VALID.includes(scope)) {
    const cur = config.autoRecordType ?? defaults.autoRecordType ?? 'off'
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 🎭 *AUTO RECORD TYPE*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ 📍 *Current:* ' + cur + '\n' +
      '┃\n' +
      '┃ *Usage:* .autorecordtype <scope>\n' +
      '┃ • off    — disabled\n' +
      '┃ • all    — everywhere\n' +
      '┃ • groups — groups only\n' +
      '┃ • dms    — DMs only\n' +
      '┃\n' +
      '┃ _Alternates record + type randomly_\n' +
      '╰───────────────━⊷'
    )
  }

  // ── Conflict: only one flex at a time ─────────────────────
  if (scope !== 'off') {
    config.autoType   = 'off'
    config.autoRecord = 'off'
  }

  config.autoRecordType = scope

  await reply(
    '╭───────────────━⊷\n' +
    '┃ 🎭 *AUTO RECORD TYPE*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    (scope === 'off'
      ? '┃ ❌ *OFF* — Record+Type flex disabled\n'
      : '┃ ✅ *' + scope.toUpperCase() + '* — Flex in ' + scope + '\n' +
        '┃ _Auto Type + Auto Record disabled_\n') +
    '╰───────────────━⊷'
  )
}
