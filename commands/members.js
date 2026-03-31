// ============================================================
//  VANGUARD MD — commands/members.js
// ============================================================

module.exports = async (ctx) => {
  const { reply, sock, jid, fromGroup } = ctx

  if (!fromGroup) return reply('❌ This command can only be used in groups!')

  try {
    const meta = await sock.groupMetadata(jid)
    const all  = meta.participants

    const list = all.map((p, i) => {
      const num  = p.id.split('@')[0]
      const role = p.admin === 'superadmin' ? '👑' : p.admin === 'admin' ? '⭐' : '👤'
      return '┃ ' + role + ' ' + (i + 1) + '. +' + num
    }).join('\n')

    await reply(
      '╭───────────────━⊷\n' +
      '┃ 👥 *MEMBERS LIST*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ 📛 *Group:* ' + meta.subject + '\n' +
      '┃ 👤 *Total:* ' + all.length + '\n' +
      '┃\n' +
      list + '\n' +
      '┃\n' +
      '┃ 👑 Owner  ⭐ Admin  👤 Member\n' +
      '╰───────────────━⊷'
    )
  } catch (err) {
    await reply('❌ Failed to fetch members: ' + err.message)
  }
}
