// ============================================================
//  VANGUARD MD — commands/setprefix.js
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
  if (newPrefix.length > 5) return reply('❌ Prefix too long! Maximum 5 characters.')

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
