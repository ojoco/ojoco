// ============================================================
//  VANGUARD MD — commands/kickall.js
// ============================================================

const { isBotAdmin, isSenderAdmin, jidToNum } = require('../lib/utils')

module.exports = async (ctx) => {
  const { sock, jid, reply, fromGroup, isSudo, sender } = ctx

  if (!fromGroup) return reply('❌ Groups only!')

  const botAdmin = await isBotAdmin(sock, jid)
  if (!botAdmin) return reply('❌ _Bot must be admin!_')

  const senderAdmin = await isSenderAdmin(sock, jid, sender)
  if (!isSudo && !senderAdmin) return reply('❌ _Admins only!_')

  try {
    const meta = await sock.groupMetadata(jid)
    const botNum = jidToNum(sock.user?.id || '')

    // ── Keep creators and bot — kick everyone else ────────────
    const toKick = meta.participants.filter(p => {
      const num = jidToNum(p.id || '')
      const isCreator  = p.admin === 'superadmin'
      const isBot      = num === botNum
      return !isCreator && !isBot
    }).map(p => p.id)

    if (!toKick.length) {
      return reply('ℹ️ _No members to kick!_')
    }

    await reply(
      '╭───────────────━⊷\n' +
      '┃ 🚫 *KICK ALL*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ ⏳ _Kicking ' + toKick.length + ' members..._\n' +
      '╰───────────────━⊷'
    )

    // ── Kick in batches of 5 to avoid rate limits ─────────────
    let kicked  = 0
    let failed  = 0
    const BATCH = 5

    for (let i = 0; i < toKick.length; i += BATCH) {
      const batch = toKick.slice(i, i + BATCH)
      try {
        await sock.groupParticipantsUpdate(jid, batch, 'remove')
        kicked += batch.length
      } catch (_) {
        failed += batch.length
      }
      // Small delay between batches
      if (i + BATCH < toKick.length) {
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    await reply(
      '╭───────────────━⊷\n' +
      '┃ 🚫 *KICK ALL — DONE*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ ✅ *Kicked:* ' + kicked + '\n' +
      (failed > 0 ? '┃ ❌ *Failed:* ' + failed + '\n' : '') +
      '┃ 🛡️ _Creators + bot preserved_\n' +
      '╰───────────────━⊷'
    )

  } catch (err) {
    await reply('❌ _Failed: ' + err.message + '_')
  }
}
