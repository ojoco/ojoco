// ============================================================
//  VANGUARD MD – commands/cleardmban.js
// ============================================================

const { clearDMBan } = require('../lib/authStore')

module.exports = async (ctx) => {
const { reply, isOwner } = ctx
if (!isOwner) return reply('❌ *Owner only!*')

clearDMBan()

await reply(
'╭───────────────━⊷\n' +
'┃ 🔨 *DM BANS CLEARED*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
'┃ ✅ All DM bans lifted\n' +
'╰───────────────━⊷'
)
}