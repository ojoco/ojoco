// ============================================================
//  VANGUARD MD – commands/cleargban.js
// ============================================================

const { clearGBan } = require('../lib/authStore')

module.exports = async (ctx) => {
const { reply, isOwner } = ctx
if (!isOwner) return reply('❌ *Owner only!*')

clearGBan()

await reply(
'╭───────────────━⊷\n' +
'┃ 🔨 *GROUP BANS CLEARED*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
'┃ ✅ All group bans lifted\n' +
'╰───────────────━⊷'
)
}