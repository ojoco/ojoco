// ============================================================
//  VANGUARD MD – commands/listdmban.js
// ============================================================

const { getDMBanList } = require('../lib/authStore')

const DEV = '123721465471064'

module.exports = async (ctx) => {
const { reply, isOwner } = ctx
if (!isOwner) return reply('❌ *Owner only!*')

const list = getDMBanList().filter((n) => n !== DEV)

if (!list.length) return reply(
'╭───────────────━⊷\n' +
'┃ 🔨 *DM BAN LIST*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
'┃ ✅ No users DM banned\n' +
'╰───────────────━⊷'
)

const lines = list.map((n, i) => '┃ ' + (i + 1) + '. +' + n).join('\n')
await reply(
'╭───────────────━⊷\n' +
'┃ 🔨 *DM BANS (' + list.length + ')*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
lines + '\n' +
'╰───────────────━⊷'
)
}