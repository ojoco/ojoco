// ============================================================
//  VANGUARD MD — commands/setprefix.js
//  Protected against > and ~ (terminal & ~prefix commands)
// ============================================================

const config = require('../config')

module.exports = async (ctx) => {
  const { reply, args, isSudo } = ctx

  if (!isSudo) return reply('❌ Only sudo/owner can use this command!')

  const newPrefix = args[0]?.trim()

  if (!newPrefix) return reply(
    '❌ Provide a new prefix!\n' +
    '_Example: .setprefix !_\n' +
    '_No prefix: .setprefix none_'
  )

  // ── BLOCK FORBIDDEN PREFIXES (> and ~) ─────────────────────
  if (newPrefix === '>' || newPrefix === '~') {
    return reply(
      '/bin/sh: ❌Error: 1: Prefix: Operation not permitted\n' +
      '/bin/sh:✅FixPoint ResolveNull: Try other prefixes not > and ~'
    )
  }

  if (newPrefix.length > 10) return reply('❌ Prefix too long! Maximum 10 characters.')

  const oldPrefix  = config.prefix
  const isNoneMode = newPrefix.toLowerCase() === 'none'
  config.prefix    = isNoneMode ? 'none' : newPrefix

  await reply(
    '╭───────────────━⊷\n' +
    '┃ 🔑 *PREFIX UPDATED*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    '┃ 📝 *Old:* ' + (oldPrefix === 'none' ? 'none (no prefix)' : oldPrefix) + '\n' +
    '┃ ✅ *New:* ' + (isNoneMode ? 'none (no prefix)' : newPrefix) + '\n' +
    '┃\n' +
    (isNoneMode
      ? '┃ 🗿 *Sigma Mode ON*\n┃ Commands work without any prefix\n┃ _Example: menu, ping, help_\n'
      : '┃ 💡 Commands now start with *' + newPrefix + '*\n┃ _Example: ' + newPrefix + 'menu_\n') +
    '╰───────────────━⊷'
  )
}
