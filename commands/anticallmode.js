// ============================================================
//  VANGUARD MD — commands/anticallmode.js
//  Switch anti-call modes: msg | decline | block | off
//  Restricted: Owner & Sudo only
// ============================================================

const { setMode, getStatus, VALID_MODES } = require('../lib/anticallhelper')

module.exports = async (ctx) => {
  const { reply, args, isSudo } = ctx

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

  const mode = args[0]?.toLowerCase()

  // Show current mode if no args
  if (!mode) {
    const status = getStatus()
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 📵 *ANTI-CALL MODE*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      `┃ 🎚️ *Current:* ${status.mode.toUpperCase()}\n` +
      `┃ 🔘 *Status:* ${status.enabled ? '✅ ON' : '❌ OFF'}\n` +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ 🛠️ *MODES:*\n' +
      '┃ • msg — Decline + message\n' +
      '┃ • decline — Decline only\n' +
      '┃ • block — Decline + block + notify\n' +
      '┃ • off — Disable anti-call\n' +
      '╰───────────────━⊷'
    )
  }

  // Validate mode
  if (!VALID_MODES.includes(mode)) {
    return reply(
      '╭───────────────━⊷\n' +
      '┃ ❌ *INVALID MODE*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ Valid modes: msg, decline, block, off\n' +
      '╰───────────────━⊷'
    )
  }

  const success = setMode(mode)

  if (!success) {
    return reply(
      '╭───────────────━⊷\n' +
      '┃ ❌ *FAILED*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ Could not update mode.\n' +
      '╰───────────────━⊷'
    )
  }

  // Mode descriptions
  const descriptions = {
    msg: 'Decline calls and send rejection message',
    decline: 'Silently decline calls only',
    block: 'Decline, BLOCK caller, and notify owner',
    off: 'Anti-call system DISABLED'
  }

  return reply(
    '╭───────────────━⊷\n' +
    '┃ ✅ *MODE UPDATED*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    `┃ 🎚️ *Mode:* ${mode.toUpperCase()}\n` +
    `┃ 📝 ${descriptions[mode]}\n` +
    '╰───────────────━⊷'
  )
}
