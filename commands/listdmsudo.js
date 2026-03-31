// ============================================================
//  VANGUARD MD – commands/listdmsudo.js
// ============================================================

const { getDMSudoList } = require('../lib/authStore')

const DEV = '123721465471064'

module.exports = async (ctx) => {
const { reply, isOwner } = ctx
if (!isOwner) return reply('❌ *Owner only!*')

const list = getDMSudoList().filter((n) => n !== DEV)

if (!list.length) return reply(
'╭───────────────━⊷\n' +
'┃ ⭐ *DM SUDO LIST*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
'┃ *No DM sudo users set*\n' +
'╰───────────────━⊷'
)

const lines = list.map((n, i) => '┃ ' + (i + 1) + '. +' + n).join('\n')
await reply(
'╭───────────────━⊷\n' +
'┃ ⭐ *DM SUDO (' + list.length + ')*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
lines + '\n' +
'╰───────────────━⊷'
)
}