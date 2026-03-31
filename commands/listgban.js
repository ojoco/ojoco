// ============================================================
//  VANGUARD MD – commands/listgban.js
// ============================================================

const { getGBanList } = require('../lib/authStore')

const DEV = '123721465471064'

module.exports = async (ctx) => {
const { reply, isOwner } = ctx
if (!isOwner) return reply('❌ *Owner only!*')

const list = getGBanList().filter((n) => n !== DEV)

if (!list.length) return reply(
'╭───────────────━⊷\n' +
'┃ 🔨 *GROUP BAN LIST*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
'┃ ✅ No users group banned\n' +
'╰───────────────━⊷'
)

const lines = list.map((n, i) => '┃ ' + (i + 1) + '. +' + n).join('\n')
await reply(
'╭───────────────━⊷\n' +
'┃ 🔨 *GROUP BANS (' + list.length + ')*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
lines + '\n' +
'╰───────────────━⊷'
)
}