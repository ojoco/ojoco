// ============================================================
//  VANGUARD MD — commands/add.js
// ============================================================

const { isBotAdmin, numToJid } = require('../lib/utils')

module.exports = async (ctx) => {
  const { reply, sock, jid, fromGroup, args, isSudo } = ctx

  if (!fromGroup) return reply('❌ This command can only be used in groups!')
  if (!isSudo) return reply('❌ Only sudo/owner can use this command!')

  const botAdmin = await isBotAdmin(sock, jid)
  if (!botAdmin) return reply('❌ I need to be an admin to add members!')

  const number = args[0]?.replace(/[^0-9]/g, '')
  if (!number) return reply('❌ Provide a number to add!\n_Example: .add 254712345678_')

  const targetJid = numToJid(number)

  try {
    const result = await sock.groupParticipantsUpdate(jid, [targetJid], 'add')
    const status = result?.[0]?.status

    if (status === '200') {
      await reply(`✅ *+${number}* has been added to the group!`)
    } else if (status === '403') {
      await reply(`❌ *+${number}* has privacy settings that prevent being added.`)
    } else if (status === '409') {
      await reply(`❌ *+${number}* is already in the group!`)
    } else {
      await reply(`⚠️ Could not add *+${number}*. Status: ${status}`)
    }
  } catch (err) {
    await reply(`❌ Failed to add member: ${err.message}`)
  }
}
