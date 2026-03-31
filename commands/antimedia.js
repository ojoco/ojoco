// ============================================================
//  VANGUARD MD — commands/antimedia.js
// ============================================================

const { saveGroupSettings, getGroupSettings, isBotAdmin, isSenderAdmin, addWarn, resetWarns, jidToNum } = require('../lib/utils')

const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage']

module.exports = async (ctx) => {
  const { reply, jid, fromGroup, args, isSudo, sock } = ctx

  if (!fromGroup) return reply('❌ This command can only be used in groups!')
  if (!isSudo)    return reply('❌ Only sudo/owner can use this command!')

  const botAdmin = await isBotAdmin(sock, jid)
  if (!botAdmin) return reply(
    '╭───────────────━⊷\n' +
    '┃ 🖼️ *ANTI MEDIA*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    '┃ ❌ *I need to be an admin first!*\n' +
    '┃ _Make me an admin before enabling_\n' +
    '╰───────────────━⊷'
  )

  const action = args[0]?.toLowerCase()
  const state  = args[1]?.toLowerCase()

  const validActions = ['warn', 'delete', 'remove']
  const validStates  = ['on', 'off']

  if (!action || !validActions.includes(action) || !state || !validStates.includes(state)) {
    const settings = getGroupSettings(jid)
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 🖼️ *ANTI MEDIA*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ ❌ Usage: *.antimedia <action> on/off*\n' +
      '┃\n' +
      '┃ *Actions:*\n' +
      '┃ • warn   — Warn (3 = kick)\n' +
      '┃ • delete — Silent delete only\n' +
      '┃ • remove — Delete + instant kick\n' +
      '┃\n' +
      '┃ 📍 *Current:* ' + (settings.antimedia ? 'ON ✅' : 'OFF ❌') + '\n' +
      '┃ ⚙️ *Action:* ' + (settings.antimediaAction || 'warn') + '\n' +
      '┃ ℹ️ _View-once messages are exempt_\n' +
      '┃ _Example: .antimedia delete on_\n' +
      '╰───────────────━⊷'
    )
  }

  saveGroupSettings(jid, {
    antimedia:       state === 'on',
    antimediaAction: action,
  })

  await reply(
    '╭───────────────━⊷\n' +
    '┃ 🖼️ *ANTI MEDIA*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    (state === 'on'
      ? '┃ ✅ *ON* — Action: *' + action.toUpperCase() + '*\n' +
        '┃ _Media from non-admins will be ' +
        (action === 'warn'   ? 'warned (3 = kick)' :
         action === 'delete' ? 'silently deleted' :
                               'deleted + user kicked') + '_\n' +
        '┃ _View-once is exempt_\n'
      : '┃ ❌ *OFF* — Media is now allowed\n') +
    '╰───────────────━⊷'
  )
}

// ── Enforcer ──────────────────────────────────────────────────
module.exports.enforce = async (sock, msg, jid, sender) => {
  try {
    const settings = getGroupSettings(jid)
    if (!settings.antimedia) return

    const msgType = Object.keys(msg.message || {})[0]

    // ── View-once exempt ──────────────────────────────────────
    if (
      msgType === 'viewOnceMessage'          ||
      msgType === 'viewOnceMessageV2'        ||
      msgType === 'viewOnceMessageV2Extension'
    ) return

    if (!MEDIA_TYPES.includes(msgType)) return

    const botAdmin = await isBotAdmin(sock, jid)
    if (!botAdmin) return

    const senderAdmin = await isSenderAdmin(sock, jid, sender)
    if (senderAdmin) return

    const action    = settings.antimediaAction || 'warn'
    const senderNum = jidToNum(sender)

    // ── Delete message first ──────────────────────────────────
    try { await sock.sendMessage(jid, { delete: msg.key }) } catch (_) {}

    // ════════════════════════════════════════════════════════
    //  WARN — real warns from 1, kick at 3 🗿
    // ════════════════════════════════════════════════════════
    if (action === 'warn') {
      const newCount = addWarn(jid, senderNum, 'antimedia')

      if (newCount >= 3) {
        resetWarns(jid, senderNum)
        try {
          await sock.groupParticipantsUpdate(jid, [sender], 'remove')
          await sock.sendMessage(jid, {
            text:
              '╭───────────────━⊷\n' +
              '┃ 🖼️ *ANTI MEDIA*\n' +
              '╰───────────────━⊷\n' +
              '╭───────────────━⊷\n' +
              '┃ 🚨 @' + senderNum + ' removed after *3 warnings!*\n' +
              '┃ 📢 *Reason:* Sending media\n' +
              '╰───────────────━⊷',
            mentions: [sender],
          })
        } catch (_) {
          await sock.sendMessage(jid, {
            text:
              '╭───────────────━⊷\n' +
              '┃ 🖼️ *ANTI MEDIA*\n' +
              '╰───────────────━⊷\n' +
              '╭───────────────━⊷\n' +
              '┃ 🚨 @' + senderNum + ' reached *3 warnings*\n' +
              '┃ ❌ _Could not remove — please kick manually_\n' +
              '╰───────────────━⊷',
            mentions: [sender],
          })
        }

      } else {
        await sock.sendMessage(jid, {
          text:
            '╭───────────────━⊷\n' +
            '┃ 🖼️ *ANTI MEDIA*\n' +
            '╰───────────────━⊷\n' +
            '╭───────────────━⊷\n' +
            '┃ ⚠️ *Warning ' + newCount + '/3* — @' + senderNum + '\n' +
            '┃ 🖼️ _Media is not allowed in this group!_\n' +
            (newCount === 2 ? '┃ 🚨 _One more = removal!_\n' : '') +
            '╰───────────────━⊷',
          mentions: [sender],
        })
      }

    // ════════════════════════════════════════════════════════
    //  DELETE — completely silent 🗿
    // ════════════════════════════════════════════════════════
    } else if (action === 'delete') {
      // Message already deleted above — total silence
      require('../lib/logger').info(`🖼️ SILENT DELETE | ${senderNum} | media removed`)

    // ════════════════════════════════════════════════════════
    //  REMOVE — instant kick, no mercy 🗿
    // ════════════════════════════════════════════════════════
    } else if (action === 'remove') {
      try {
        await sock.groupParticipantsUpdate(jid, [sender], 'remove')
        await sock.sendMessage(jid, {
          text:
            '╭───────────────━⊷\n' +
            '┃ 🖼️ *ANTI MEDIA*\n' +
            '╰───────────────━⊷\n' +
            '╭───────────────━⊷\n' +
            '┃ 🚫 @' + senderNum + ' removed for sending media!\n' +
            '╰───────────────━⊷',
          mentions: [sender],
        })
      } catch (_) {
        await sock.sendMessage(jid, {
          text:
            '╭───────────────━⊷\n' +
            '┃ 🖼️ *ANTI MEDIA*\n' +
            '╰───────────────━⊷\n' +
            '╭───────────────━⊷\n' +
            '┃ ⚠️ @' + senderNum + ' sent media\n' +
            '┃ ❌ _Could not remove — please kick manually_\n' +
            '╰───────────────━⊷',
          mentions: [sender],
        })
      }
    }

  } catch (err) {
    require('../lib/logger').error(`🖼️ Antimedia enforce error: ${err.message}`)
  }
}
