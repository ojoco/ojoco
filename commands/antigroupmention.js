// ============================================================
//  VANGUARD MD — commands/antigroupmention.js
//  Zero Mercy 🗿 — detect, act, done
// ============================================================

const { getGroupSettings, saveGroupSettings, addWarn, resetWarns, jidToNum, isBotAdmin, isSenderAdmin } = require('../lib/utils')
const config   = require('../config')
const defaults = require('../defaults')
const logger   = require('../lib/logger')

module.exports = async (ctx) => {
  const { reply, sock, jid, fromGroup, args, isSudo } = ctx

  if (!fromGroup) return reply('❌ This command can only be used in groups!')
  if (!isSudo)    return reply('❌ Only sudo/owner can use this command!')

  const botAdmin = await isBotAdmin(sock, jid)
  if (!botAdmin) return reply(
    '╭───────────────━⊷\n' +
    '┃ 📢 *ANTI GROUP MENTION*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    '┃ ❌ *I need to be an admin first!*\n' +
    '┃ _Make me an admin before enabling_\n' +
    '╰───────────────━⊷'
  )

  const action = args[0]?.toLowerCase()
  const state  = args[1]?.toLowerCase()

  const validActions = ['warn', 'remove', 'delete']
  const validStates  = ['on', 'off']

  if (!action || !validActions.includes(action) || !state || !validStates.includes(state)) {
    const settings = getGroupSettings(jid)
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 📢 *ANTI GROUP MENTION*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ ❌ Usage: *.antigroupmention <action> on/off*\n' +
      '┃\n' +
      '┃ *Actions:*\n' +
      '┃ • warn   — Warn in group (3 = kick)\n' +
      '┃ • remove — Kick immediately\n' +
      '┃ • delete — Silent delete only\n' +
      '┃\n' +
      '┃ 📍 *Current:* ' + (settings.antigroupmention ? 'ON ✅' : 'OFF ❌') + '\n' +
      '┃ ⚙️ *Action:* ' + (settings.antigroupmentionAction || 'warn') + '\n' +
      '┃ _Each group has independent settings_\n' +
      '┃ _Example: .antigroupmention warn on_\n' +
      '╰───────────────━⊷'
    )
  }

  saveGroupSettings(jid, {
    antigroupmention:       state === 'on',
    antigroupmentionAction: action,
  })

  await reply(
    '╭───────────────━⊷\n' +
    '┃ 📢 *ANTI GROUP MENTION*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    (state === 'on'
      ? '┃ ✅ *ON* — Action: *' + action.toUpperCase() + '*\n' +
        '┃ _Members who mention this group in their status will be ' +
        (action === 'warn'   ? 'warned (3 = kick)' :
         action === 'remove' ? 'kicked immediately' :
                               'silently deleted') + '_\n'
      : '┃ ❌ *OFF* — Group mention protection disabled\n') +
    '╰───────────────━⊷'
  )
}

// ── Recent joins tracker ──────────────────────────────────────
const recentJoins = new Map()
module.exports.recentJoins = recentJoins

setInterval(() => {
  const now = Date.now()
  for (const [key, time] of recentJoins.entries()) {
    if (now - time > 60000) recentJoins.delete(key)
  }
}, 60000)

// ── Canonical digits-only normalizer ─────────────────────────
const toPhoneNum = (raw) => {
  if (!raw) return ''
  return raw
    .replace(/:[0-9]+@/, '@')
    .replace(/@.*/, '')
    .replace(/[^0-9]/g, '')
    .trim()
}

const resolveSenderLid = async (sock, rawSender, jid) => {
  if (!rawSender) return rawSender
  if (!rawSender.endsWith('@lid')) return rawSender

  try {
    const meta       = await sock.groupMetadata(jid)
    const rawLidBase = rawSender.split('@')[0]
    const rawLidNum  = rawLidBase.split(':')[0]

    const lidMatch = meta.participants.find(p => {
      if (!p.lid) return false
      const pLidBase = p.lid.split('@')[0]
      const pLidNum  = pLidBase.split(':')[0]
      return pLidBase === rawLidBase || pLidNum === rawLidNum
    })
    if (lidMatch?.id) {
      const resolved = lidMatch.id.replace(/:[0-9]+@/, '@')
      logger.info(`📢 @lid resolved → ${resolved}`)
      return resolved
    }

    const idMatch = meta.participants.find(p => {
      const pIdNum = p.id ? p.id.split('@')[0].split(':')[0] : ''
      return pIdNum === rawLidNum
    })
    if (idMatch?.id) {
      const resolved = idMatch.id.replace(/:[0-9]+@/, '@')
      logger.info(`📢 @lid resolved via id → ${resolved}`)
      return resolved
    }

    const participantLid = meta.participants.find(p => {
      if (!p.lid) return false
      const pLidNum = p.lid.split('@')[0].split(':')[0]
      return pLidNum === rawLidNum
    })
    if (participantLid?.lid) {
      logger.info(`📢 Non-contact — using participant lid: ${participantLid.lid}`)
      return participantLid.lid
    }
  } catch (err) {
    logger.error(`📢 resolveSenderLid error: ${err.message}`)
  }

  return rawSender
}

const buildSenderDisplay = (resolvedSender) => {
  if (!resolvedSender) return { senderNum: 'unknown', senderPhone: null, kickJid: null, warnKey: 'unknown' }

  if (resolvedSender.endsWith('@lid')) {
    const lidNum = resolvedSender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    return {
      senderNum:   lidNum,
      senderPhone: resolvedSender,
      kickJid:     resolvedSender,
      warnKey:     lidNum,
    }
  }

  const num = jidToNum(resolvedSender)
  return {
    senderNum:   num,
    senderPhone: num + '@s.whatsapp.net',
    kickJid:     num + '@s.whatsapp.net',
    warnKey:     num,
  }
}

module.exports.enforceCard = async (sock, msg, jid) => {
  try {
    const m           = msg.message || {}
    let detected      = false
    let sender        = null
    let senderIsAdmin = false

    // ── DETECTOR 1: stubType 27 — log only, no action ─────────
    // Now that join/leave are handled by groupEvents.js
    // stub27 is just a notification — we log and exit
    if (msg.messageStubType === 27) {
      logger.info(`📢 [D1-STUB27] Logged only — no action taken`)
      return
    }

    // ── DETECTOR 2: groupStatusMentionMessage (2025+) ─────────
    if (!detected && m.groupStatusMentionMessage) {
      detected = true
      sender   = msg.key.participant || msg.participant || msg.key.remoteJid
      logger.info(`📢 [D2-STATUSMENTION] ${jid} | sender raw: ${sender}`)
    }

    // ── DETECTOR 3: contextInfo.groupMentions (legacy) ────────
    if (!detected) {
      const contextInfo = (
        m.extendedTextMessage?.contextInfo                ||
        m.imageMessage?.contextInfo                       ||
        m.videoMessage?.contextInfo                       ||
        m.groupStatusMentionMessage?.message?.contextInfo ||
        null
      )
      const groupMentions = contextInfo?.groupMentions || []
      if (groupMentions.some(gm => gm.groupJid === jid)) {
        detected = true
        sender   = msg.key.participant || msg.participant || msg.key.remoteJid
        logger.info(`📢 [D3-LEGACY] ${jid} | sender: ${sender}`)
      }
    }

    // ── DETECTOR 4: protocolMessage type 25 ───────────────────
    if (!detected && m.protocolMessage?.type === 25) {
      detected = true
      sender   = msg.key.participant || msg.participant || msg.key.remoteJid
      logger.info(`📢 [D4-PROTO25] ${jid} | sender: ${sender}`)
    }

    if (!detected || !sender) return

    const settings = getGroupSettings(jid)
    if (!settings.antigroupmention) return

    const botAdmin = await isBotAdmin(sock, jid)
    if (!botAdmin) return

    const resolvedSender = await resolveSenderLid(sock, sender, jid)

    if (!senderIsAdmin) {
      senderIsAdmin = await isSenderAdmin(sock, jid, resolvedSender)
    }
    if (senderIsAdmin) return

    const { senderNum, senderPhone, kickJid, warnKey } = buildSenderDisplay(resolvedSender)
    const action = settings.antigroupmentionAction || 'warn'

    logger.info(`📢 Enforcing ${action} | display: ${senderNum} | kick: ${kickJid}`)

    // ── Delete card — only real messages, skip stubs ──────────
    if (!msg.messageStubType) {
      try {
        await sock.sendMessage(jid, {
          delete: {
            remoteJid:   jid,
            id:          msg.key.id,
            fromMe:      false,
            participant: msg.key.participant || sender,
          }
        })
      } catch (_) {}
      await new Promise(r => setTimeout(r, 500))
    } else {
      logger.info(`📢 STUB DELETE SKIPPED | stubType: ${msg.messageStubType} | sender: ${senderNum}`)
      return
    }

    // ════════════════════════════════════════════════════════
    //  REMOVE — instant kick, no mercy, no count 🗿
    // ════════════════════════════════════════════════════════
    if (action === 'remove') {
      try {
        await sock.groupParticipantsUpdate(jid, [kickJid], 'remove')
        await sock.sendMessage(jid, {
          text:
            '╭───────────────━⊷\n' +
            '┃ 📢 *ANTI GROUP MENTION*\n' +
            '╰───────────────━⊷\n' +
            '╭───────────────━⊷\n' +
            '┃ 🚫 @' + senderNum + ' has been removed!\n' +
            '┃ 📢 *Reason:* Mentioning this group in their status\n' +
            '╰───────────────━⊷',
          mentions: [senderPhone],
        })
        logger.info(`📢 REMOVED ${senderNum} instantly`)
      } catch (_) {
        await sock.sendMessage(jid, {
          text:
            '╭───────────────━⊷\n' +
            '┃ 📢 *ANTI GROUP MENTION*\n' +
            '╰───────────────━⊷\n' +
            '╭───────────────━⊷\n' +
            '┃ ⚠️ @' + senderNum + ' mentioned this group in their status\n' +
            '┃ ❌ Could not remove — please kick manually\n' +
            '╰───────────────━⊷',
          mentions: [senderPhone],
        })
      }

    // ════════════════════════════════════════════════════════
    //  WARN — real warns from 1, kick at 3 🗿
    // ════════════════════════════════════════════════════════
    } else if (action === 'warn') {
      const newCount = addWarn(jid, warnKey, 'antigroupmention')

      if (newCount >= 3) {
        // ── 3 strikes — kick! ──────────────────────────────
        resetWarns(jid, warnKey)
        try {
          await sock.groupParticipantsUpdate(jid, [kickJid], 'remove')
          await sock.sendMessage(jid, {
            text:
              '╭───────────────━⊷\n' +
              '┃ 📢 *ANTI GROUP MENTION*\n' +
              '╰───────────────━⊷\n' +
              '╭───────────────━⊷\n' +
              '┃ 🚨 @' + senderNum + ' removed after *3 warnings!*\n' +
              '┃ 📢 *Reason:* Mentioning this group in their status\n' +
              '╰───────────────━⊷',
            mentions: [senderPhone],
          })
          logger.info(`📢 KICKED ${senderNum} after 3 warns`)
        } catch (_) {
          await sock.sendMessage(jid, {
            text:
              '╭───────────────━⊷\n' +
              '┃ 📢 *ANTI GROUP MENTION*\n' +
              '╰───────────────━⊷\n' +
              '╭───────────────━⊷\n' +
              '┃ 🚨 @' + senderNum + ' reached *3 warnings*\n' +
              '┃ ❌ _Could not remove — please kick manually_\n' +
              '╰───────────────━⊷',
            mentions: [senderPhone],
          })
        }

      } else {
        // ── Real visible warn from strike 1 ────────────────
        await sock.sendMessage(jid, {
          text:
            '╭───────────────━⊷\n' +
            '┃ 📢 *ANTI GROUP MENTION*\n' +
            '╰───────────────━⊷\n' +
            '╭───────────────━⊷\n' +
            '┃ ⚠️ *Warning ' + newCount + '/3* — @' + senderNum + '\n' +
            '┃ 📢 _Do not mention this group in your status!_\n' +
            (newCount === 2 ? '┃ 🚨 _One more violation = removal!_\n' : '') +
            '╰───────────────━⊷',
          mentions: [senderPhone],
        })
        logger.info(`📢 WARNED ${senderNum} — strike ${newCount}/3`)
      }

    // ════════════════════════════════════════════════════════
    //  DELETE — completely silent, nothing sent anywhere 🗿
    // ════════════════════════════════════════════════════════
    } else if (action === 'delete') {
      // Card already deleted above — total silence
      logger.info(`📢 SILENT DELETE | ${senderNum} | card removed, no messages sent`)
    }

  } catch (err) {
    logger.error(`📢 enforceCard error: ${err.message}`)
  }
}
