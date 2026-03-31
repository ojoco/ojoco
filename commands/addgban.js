// ============================================================
//  VANGUARD MD – commands/addgban.js
// ============================================================

const { resolveTarget } = require('../lib/resolveTarget')
const { addGBan, matchGBan } = require('../lib/authStore')

const DEV = '123721465471064'

module.exports = async (ctx) => {
const { reply, args, quoted, msg, sock, jid, isOwner } = ctx
if (!isOwner) return reply('❌ *Owner only!*')

const result = await resolveTarget(args, quoted, msg, sock, jid)
if (result.wasLid) return reply('❌ *Cannot resolve linked device.*\n_Type number directly: .addgban 256XXXXXXXXX_')
if (!result.num)   return reply('❌ *No target!* Tag, reply, or provide a number.')

const num = result.num

if (num === DEV) return reply('❌ Failed : Cannot Define Properties of Ctx vanguard.js 417')

if (matchGBan(num + '@s.whatsapp.net')) return reply('⚠️ *+' + num + ' is already group banned!*')

const added = addGBan(num)
if (!added) return reply('⚠️ *+' + num + ' is already group banned!*')

await reply(
'╭───────────────━⊷\n' +
'┃ 🔨 *GROUP BANNED*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
'┃ 👤 *+' + num + '*\n' +
'┃ 🚫 Blocked *in groups only*\n' +
'┃ ✅ Still works in DMs\n' +
'╰───────────────━⊷'
)
}