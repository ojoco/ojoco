// ============================================================
//  VANGUARD MD — commands/anticallmsg.js
//  Set custom anti-call rejection message
//  Variables: {caller}, {me}, {calltype}, {time}
//  Restricted: Owner & Sudo only
// ============================================================

const { setCustomMessage, getMessage } = require('../lib/anticallhelper')

module.exports = async (ctx) => {
  const { reply, args, isSudo, sock } = ctx

  // Permission check
  if (!isSudo) {
    return reply(
      '╭───────────────━⊷\n' +
      '┃ ❌ *ACCESS DENIED*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ 🔒 Owner/Sudo only command.\n' +
      '╰───────────────━⊷'
    )
  }

  const customText = args.join(' ')

  if (!customText) {
    const currentMsg = getMessage()
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 📝 *ANTI-CALL MESSAGE*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ *Current message:*\n' +
      `┃ _${currentMsg}_\n` +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ 🛠️ *USAGE:*\n' +
      '┃ .anticallmsg <your message>\n' +
      '┃\n' +
      '┃ *Variables:*\n' +
      '┃ • {caller} — Callers number\n' +
      '┃ • {me} — Bot name\n' +
      '┃ • {calltype} — voice/video\n' +
      '┃ • {time} — Current time\n' +
      '┃\n' +
      '┃ *Example:*\n' +
      '┃ .anticallmsg Hey {caller}, {me} is busy!\n' +
      '╰───────────────━⊷'
    )
  }

  const success = setCustomMessage(customText)

  if (success) {
    // Generate preview with sample data
    const preview = customText
      .replace(/{caller}/gi, '2567XXXXXXX')
      .replace(/{me}/gi, sock.user?.name || 'VANGUARD MD')
      .replace(/{calltype}/gi, 'voice')
      .replace(/{time}/gi, new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }))

    return reply(
      '╭───────────────━⊷\n' +
      '┃ ✅ *MESSAGE SET*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ 📝 *Preview:*\n' +
      `┃ _${preview}_\n` +
      '╰───────────────━⊷'
    )
  } else {
    return reply(
      '╭───────────────━⊷\n' +
      '┃ ❌ *FAILED*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ Could not save message.\n' +
      '╰───────────────━⊷'
    )
  }
}
