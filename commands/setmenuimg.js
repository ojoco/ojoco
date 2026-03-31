// ============================================================
//  VANGUARD MD — commands/setmenuimage.js
//  Replace the bot menu image with a quoted image.
//  Strictly images only — all other formats rejected.
//  Sends “Initialising ⏳…” then edits to ✅ when done.
// ============================================================

const fs   = require('fs')
const path = require('path')

const IMAGE_PATH = path.join(__dirname, '..', 'assets', 'botimage.jpg')

module.exports = async (ctx) => {
const { sock, msg, jid, quoted, isSudo } = ctx

if (!isSudo) return ctx.reply('❌ *Owner/Sudo only!*')

// ── Must be a reply ───────────────────────────────────────
if (!quoted || !quoted.message) {
return ctx.reply(
'╭───────────────━⊷\n' +
'┃ ❌ *NO IMAGE QUOTED*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
'┃ *Reply to an image to set it as the menu image.*\n' +
'╰───────────────━⊷'
)
}

// ── Strictly image only ───────────────────────────────────
const qMsg       = quoted.message
const imageMsg   = qMsg.imageMessage || qMsg.viewOnceMessage?.message?.imageMessage
const isImage    = Boolean(imageMsg)

if (!isImage) {
return ctx.reply(
'╭───────────────━⊷\n' +
'┃ ❌ *IMAGES ONLY*\n' +
'╰───────────────━⊷\n' +
'╭───────────────━⊷\n' +
'┃ *Only image files are accepted.*\n' +
'┃ *Videos, stickers, documents — not allowed.*\n' +
'╰───────────────━⊷'
)
}

// ── Send progress message — will be edited on completion ──
let progressMsg
try {
progressMsg = await sock.sendMessage(jid, {
text: 'Initialising ⏳…',
}, { quoted: msg })
} catch (_) {}

try {
// ── Download image from quoted message ────────────────
const { downloadContentFromMessage } = await import('@whiskeysockets/baileys')

const stream = await downloadContentFromMessage(imageMsg, 'image')
const chunks = []
for await (const chunk of stream) {
  chunks.push(chunk)
}
const buffer = Buffer.concat(chunks)

if (!buffer || buffer.length === 0) {
  throw new Error('Downloaded buffer is empty')
}

// ── Ensure assets folder exists ───────────────────────
const assetsDir = path.join(__dirname, '..', 'assets')
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

// ── Write to assets/botimage.jpg ──────────────────────
fs.writeFileSync(IMAGE_PATH, buffer)

// ── Edit progress message to success ─────────────────
if (progressMsg?.key) {
  try {
    await sock.sendMessage(jid, {
      text:  '✅ *Operation successful!*\n_Menu image updated. Send_ `' +
             (ctx.prefix || '.') + 'menu` _to preview._',
      edit:  progressMsg.key,
    })
  } catch (_) {
    await ctx.reply('✅ *Menu image updated successfully!*')
  }
} else {
  await ctx.reply('✅ *Menu image updated successfully!*')
}
} catch (err) {
// ── Edit to failure if something went wrong ───────────
if (progressMsg?.key) {
try {
await sock.sendMessage(jid, {
text: '❌ *Failed:* *' + err.message + '*',
edit: progressMsg.key,
})
} catch (_) {
await ctx.reply('❌ *Failed:* *' + err.message + '*')
}
} else {
await ctx.reply('❌ *Failed:* *' + err.message + '*')
}
}
}