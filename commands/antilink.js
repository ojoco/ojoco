// ============================================================
//  VANGUARD MD — commands/antilink.js
// ============================================================

const { isBotAdmin, isSenderAdmin, saveGroupSettings, getGroupSettings, addWarn, resetWarns, jidToNum } = require('../lib/utils')

const PROTOCOL_REGEX    = /https?:\/\/[^\s]+|ftp:\/\/[^\s]+/i
const WWW_REGEX         = /www\.[a-z0-9-]+\.[a-z]{2,}[^\s]*/i
const WA_REGEX          = /chat\.whatsapp\.com\/[^\s]+/i
const SHORTENER_REGEX   = /\b(?:bit\.ly|t\.me|tinyurl\.com|goo\.gl|ow\.ly|buff\.ly|rb\.gy|is\.gd|short\.io|tiny\.cc|cutt\.ly|youtu\.be|vm\.tiktok\.com|instagram\.com|facebook\.com|fb\.com|twitter\.com|x\.com|telegram\.me|discord\.gg|discord\.com\/invite|linktr\.ee|wa\.me)\/[^\s]*/i
const BARE_DOMAIN_REGEX = /\b[a-z0-9-]{2,}\.(com|net|org|io|co|app|dev|xyz|info|biz|gg|tv|me|ly|link|site|web|online|store|shop|live|news|media|tech|ai|cloud)(?:\/[^\s]*)?\b/i

const containsLink = (text) => {
  if (!text || typeof text !== 'string') return false
  return (
    PROTOCOL_REGEX.test(text)  ||
    WWW_REGEX.test(text)       ||
    WA_REGEX.test(text)        ||
    SHORTENER_REGEX.test(text) ||
    BARE_DOMAIN_REGEX.test(text)
  )
}

module.exports = async (ctx) => {
  const { reply, jid, fromGroup, args, isSudo } = ctx

  if (!fromGroup) return reply('❌ This command can only be used in groups!')
  if (!isSudo)    return reply('❌ Only sudo/owner can use this command!')

  const action = args[0]?.toLowerCase()
  const state  = args[1]?.toLowerCase()

  const validActions = ['warn', 'delete', 'remove']
  const validStates  = ['on', 'off']

  if (!action || !validActions.includes(action) || !state || !validStates.includes(state)) {
    const settings = getGroupSettings(jid)
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 🔗 *ANTI LINK*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ ❌ Usage: *.antilink <action> on/off*\n' +
      '┃\n' +
      '┃ *Actions:*\n' +
      '┃ • warn   — Warn (3 = kick)\n' +
      '┃ • delete — Silent delete only\n' +
      '┃ • remove — Delete + instant kick\n' +
      '┃\n' +
      '┃ 📍 *Current:* ' + (settings.antilink ? 'ON ✅' : 'OFF ❌') + '\n' +
      '┃ ⚙️ *Action:* ' + (settings.antilinkAction || 'warn') + '\n' +
      '┃ _Example: .antilink warn on_\n' +
      '╰───────────────━⊷'
    )
  }

  saveGroupSettings(jid, {
    antilink:       state === 'on',
    antilinkAction: action,
  })

  await reply(
    '╭───────────────━⊷\n' +
    '┃ 🔗 *ANTI LINK*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    (state === 'on'
      ? '┃ ✅ *ON* — Action: *' + action.toUpperCase() + '*\n' +
        '┃ _Links sent by non-admins will be ' +
        (action === 'warn'   ? 'warned (3 = kick)' :
         action === 'delete' ? 'silently deleted' :
                               'deleted + user kicked') + '_\n'
      : '┃ ❌ *OFF* — Links are now allowed\n') +
    '╰───────────────━⊷'
  )
}

// ── Enforcer ──────────────────────────────────────────────────
module.exports.enforce = async (sock, msg, jid, sender) => {
  try {
    const settings = getGroupSettings(jid)
    if (!settings.antilink) return

    const body = (
      msg.message?.conversation                          ||
      msg.message?.extendedTextMessage?.text             ||
      msg.message?.imageMessage?.caption                 ||
      msg.message?.videoMessage?.caption                 ||
      msg.message?.documentMessage?.caption              ||
      msg.message?.buttonsResponseMessage?.selectedButtonId ||
      ''
    )

    if (!containsLink(body)) return

    const botAdmin = await isBotAdmin(sock, jid)
    if (!botAdmin) return

    const senderAdmin = await isSenderAdmin(sock, jid, sender)
    if (senderAdmin) return

    const action    = settings.antilinkAction || 'warn'
    const senderNum = jidToNum(sender)

    // ── Delete message first ──────────────────────────────────
    try { await sock.sendMessage(jid, { delete: msg.key }) } catch (_) {}

    // ════════════════════════════════════════════════════════
    //  WARN — real warns from 1, kick at 3 🗿
    // ════════════════════════════════════════════════════════
    if (action === 'warn') {
      const newCount = addWarn(jid, senderNum, 'antilink')

      if (newCount >= 3) {
        resetWarns(jid, senderNum)
        try {
          await sock.groupParticipantsUpdate(jid, [sender], 'remove')
          await sock.sendMessage(jid, {
            text:
              '╭───────────────━⊷\n' +
              '┃ 🔗 *ANTI LINK*\n' +
              '╰───────────────━⊷\n' +
              '╭───────────────━⊷\n' +
              '┃ 🚨 @' + senderNum + ' removed after *3 warnings!*\n' +
              '┃ 📢 *Reason:* Sending links\n' +
              '╰───────────────━⊷',
            mentions: [sender],
          })
        } catch (_) {
          await sock.sendMessage(jid, {
            text:
              '╭───────────────━⊷\n' +
              '┃ 🔗 *ANTI LINK*\n' +
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
            '┃ 🔗 *ANTI LINK*\n' +
            '╰───────────────━⊷\n' +
            '╭───────────────━⊷\n' +
            '┃ ⚠️ *Warning ' + newCount + '/3* — @' + senderNum + '\n' +
            '┃ 🔗 _Links are not allowed in this group!_\n' +
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
      require('../lib/logger').info(`🔗 SILENT DELETE | ${senderNum} | link removed`)

    // ════════════════════════════════════════════════════════
    //  REMOVE — instant kick, no mercy 🗿
    // ════════════════════════════════════════════════════════
    } else if (action === 'remove') {
      try {
        await sock.groupParticipantsUpdate(jid, [sender], 'remove')
        await sock.sendMessage(jid, {
          text:
            '╭───────────────━⊷\n' +
            '┃ 🔗 *ANTI LINK*\n' +
            '╰───────────────━⊷\n' +
            '╭───────────────━⊷\n' +
            '┃ 🚫 @' + senderNum + ' removed for sending a link!\n' +
            '╰───────────────━⊷',
          mentions: [sender],
        })
      } catch (_) {
        await sock.sendMessage(jid, {
          text:
            '╭───────────────━⊷\n' +
            '┃ 🔗 *ANTI LINK*\n' +
            '╰───────────────━⊷\n' +
            '╭───────────────━⊷\n' +
            '┃ ⚠️ @' + senderNum + ' sent a link\n' +
            '┃ ❌ _Could not remove — please kick manually_\n' +
            '╰───────────────━⊷',
          mentions: [sender],
        })
      }
    }

  } catch (err) {
    require('../lib/logger').error('🔗 Antilink enforce error: ' + err.message)
  }
}
