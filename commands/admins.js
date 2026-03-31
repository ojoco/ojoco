// ============================================================
//  VANGUARD MD — commands/admins.js
// ============================================================

const config   = require('../config')
const defaults = require('../defaults')

module.exports = async (ctx) => {
  const { reply, sock, jid, fromGroup } = ctx

  if (!fromGroup) return reply('❌ This command can only be used in groups!')

  try {
    const meta   = await sock.groupMetadata(jid)
    const admins = meta.participants.filter(
      p => p.admin === 'admin' || p.admin === 'superadmin'
    )

    if (!admins.length) return reply('❌ No admins found in this group!')

    const botName = config.botName || defaults.botName || 'VANGUARD MD'

    const list = admins.map(p => {
      const num  = p.id.split('@')[0]
      const role = p.admin === 'superadmin' ? '👑 Owner' : '⭐ Admin'
      return '┃ ' + role + ': +' + num
    }).join('\n')

    const mentions = admins.map(p => p.id)

    await reply({
      text:
        '╭───────────────━⊷\n' +
        '┃ ⭐ *GROUP ADMINS*\n' +
        '╰───────────────━⊷\n' +
        '╭───────────────━⊷\n' +
        '┃ 📛 *Group:* ' + meta.subject + '\n' +
        '┃ ⭐ *Total Admins:* ' + admins.length + '\n' +
        '┃\n' +
        list + '\n' +
        '╰───────────────━⊷\n' +
        '> *_' + botName + '_*',
      mentions,
    })
  } catch (err) {
    await reply('❌ Failed to fetch admins: ' + err.message)
  }
}
