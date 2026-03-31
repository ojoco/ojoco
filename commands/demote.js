// ============================================================
//  VANGUARD MD — commands/demote.js
// ============================================================

const { isBotAdmin, isSenderAdmin } = require('../lib/utils')

module.exports = async (ctx) => {
  const { reply, sock, jid, fromGroup, sender, mentions, quoted, isSudo } = ctx

  if (!fromGroup) return reply('❌ This command can only be used in groups!')

  // ── Admins + sudo can use ─────────────────────────────────
  const senderIsAdmin = await isSenderAdmin(sock, jid, sender)
  if (!isSudo && !senderIsAdmin) return reply('❌ Only admins can use this command!')

  const botAdmin = await isBotAdmin(sock, jid)
  if (!botAdmin) return reply('❌ I need to be an admin to demote members!')

  let target = mentions?.[0] || null
  if (!target && quoted?.sender) target = quoted.sender
  if (!target) return reply('❌ Mention or reply to someone to demote!\n_Example: .demote @user_')

  // ── Normalize for bot self-demote ─────────────────────────
  const normalize   = (j) => (j || '').replace(/:[0-9]+@/, '@')
  const botJid      = normalize(sock.user?.id)
  const targetClean = normalize(target)

  const targetJid = targetClean === botJid ? sock.user?.id : target

  try {
    await sock.groupParticipantsUpdate(jid, [targetJid], 'demote')
    await reply({
      text:     '✅ _Mission Completed Successfully_',
      mentions: [targetJid],
    })
  } catch (err) {
    await reply('❌ Failed to Demote: Not Admin / Group Creator')
  }
}
