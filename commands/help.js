// ============================================================
//  VANGUARD MD — commands/help.js
// ============================================================

const fs       = require('fs')
const path     = require('path')
const config   = require('../config')
const defaults = require('../defaults')
const { formatUptime } = require('../lib/utils')

const LOCAL_IMAGE = path.join(__dirname, '../assets/botimage.jpg')

module.exports = async (ctx) => {
  const { sock, msg, jid, sender, senderNum } = ctx

  const prefix   = config.prefix      || defaults.prefix      || '.'
  const botName  = config.botName     || defaults.botName     || 'VANGUARD MD'
  const mode     = config.mode        || defaults.mode        || 'public'
  const owner    = config.ownerNumber || defaults.ownerNumber || ''
  const ownerJid = owner ? owner + '@s.whatsapp.net' : null
  const uptime   = formatUptime(process.uptime())
  const time     = new Date().toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    hour12:   true,
    weekday:  'short',
    year:     'numeric',
    month:    'short',
    day:      'numeric',
    hour:     '2-digit',
    minute:   '2-digit',
  })

  const start    = Date.now()
  const ping     = Date.now() - start + 'ms'
  const p        = prefix === 'none' || prefix === '' ? '' : prefix

  const cmdCount = fs.readdirSync(path.join(__dirname))
    .filter(f => f.endsWith('.js') && f !== 'help.js').length

  const help =
    '╭───────────────━⊷\n' +
    '┃ *🤖 ' + botName + ' 🤖*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    '┃ 🧑‍💻 *Owner:* @' + owner + '\n' +
    '┃ 🛠️ *Prefix:* ' + (p || 'none') + '\n' +
    '┃ 👥 *User:* @' + senderNum + '\n' +
    '┃ 💾 *Host:* Panel\n' +
    '┃ ⚡ *Speed:* ' + ping + '\n' +
    '┃ 💻 *Version:* 1.9.1 beta\n' +
    '┃ 🛡️ *Mode:* ' + mode.toUpperCase() + '\n' +
    '┃ 🕐 *Time:* ' + time + '\n' +
    '┃ ⏱️ *Uptime:* ' + uptime + '\n' +
    '┃ 🧩 *Modules:* ' + cmdCount + '+\n' +
    '┃ 🥤 *Developer:* Admin Blue\n' +
    '╰───────────────━⊷\n' +
    '\n' +

    // ── 1. OWNER ───────────────────────────────────────────
    '╭─┴❍「 👑 OWNER 」❍\n' +
    '│★ ' + p + 'ban\n' +
    '│★ ' + p + 'block\n' +
    '│★ ' + p + 'broadcast\n' +
    '│★ ' + p + 'channeljid\n' +
    '│★ ' + p + 'cleartemp\n' +
    '│★ ' + p + 'delete\n' +
    '│★ ' + p + 'exit\n' +
    '│★ ' + p + 'getpp\n' +
    '│★ ' + p + 'join\n' +
    '│★ ' + p + 'leave\n' +
    '│★ ' + p + 'listban\n' +
    '│★ ' + p + 'listblocked\n' +
    '│★ ' + p + 'restart\n' +
    '│★ ' + p + 'setbotname\n' +
    '│★ ' + p + 'setpp\n' +
    '│★ ' + p + 'temprepo\n' +
    '│★ ' + p + 'unban\n' +
    '│★ ' + p + 'unbanall\n' +
    '│★ ' + p + 'unblock\n' +
    '│★ ' + p + 'vv\n' +
    '│★ ' + p + 'vv2\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 2. SETTINGS ───────────────────────────────────────
    '╭─┴❍「 ⚙️ SETTINGS 」❍\n' +
    '│★ ' + p + 'alwaysonline\n' +
    '│★ ' + p + 'anticall\n' +
    '│★ ' + p + 'antidelete\n' +
    '│★ ' + p + 'antideletestatus\n' +
    '│★ ' + p + 'antiedit\n' +
    '│★ ' + p + 'autoreactstatus\n' +
    '│★ ' + p + 'autoread\n' +
    '│★ ' + p + 'autorecord\n' +
    '│★ ' + p + 'autorecordtype\n' +
    '│★ ' + p + 'autosavestatus\n' +
    '│★ ' + p + 'autotype\n' +
    '│★ ' + p + 'autoviewstatus\n' +
    '│★ ' + p + 'chatbot\n' +
    '│★ ' + p + 'close\n' +
    '│★ ' + p + 'open\n' +
    '│★ ' + p + 'private\n' +
    '│★ ' + p + 'public\n' +
    '│★ ' + p + 'setprefix\n' +
    '│★ ' + p + 'statusemoji\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 3. PRIVACY ────────────────────────────────────────
    '╭─┴❍「 🛡️ PRIVACY 」❍\n' +
    '│★ ' + p + 'addbadword\n' +
    '│★ ' + p + 'antibadword\n' +
    '│★ ' + p + 'antigroupmention\n' +
    '│★ ' + p + 'antilink\n' +
    '│★ ' + p + 'antimedia\n' +
    '│★ ' + p + 'antisticker\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 4. INFO ───────────────────────────────────────────
    '╭─┴❍「 📡 INFO 」❍\n' +
    '│★ ' + p + 'alive\n' +
    '│★ ' + p + 'botstatus\n' +
    '│★ ' + p + 'check\n' +
    '│★ ' + p + 'device\n' +
    '│★ ' + p + 'ms\n' +
    '│★ ' + p + 'owner\n' +
    '│★ ' + p + 'ping\n' +
    '│★ ' + p + 'ping2\n' +
    '│★ ' + p + 'repo\n' +
    '│★ ' + p + 'runtime\n' +
    '│★ ' + p + 'speed\n' +
    '│★ ' + p + 'status\n' +
    '│★ ' + p + 'time\n' +
    '│★ ' + p + 'totalmembers\n' +
    '│★ ' + p + 'uptime\n' +
    '│★ ' + p + 'userid\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 5. AI ─────────────────────────────────────────────
    '╭─┴❍「 🤖 AI 」❍\n' +
    '│★ ' + p + 'claude\n' +
    '│★ ' + p + 'gpt\n' +
    '│★ ' + p + 'grok\n' +
    '│★ ' + p + 'llama\n' +
    '│★ ' + p + 'meta\n' +
    '│★ ' + p + 'vangai\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 6. GROUP ──────────────────────────────────────────
    '╭─┴❍「 👥 GROUP 」❍\n' +
    '│★ ' + p + 'add\n' +
    '│★ ' + p + 'addbadword\n' +
    '│★ ' + p + 'admins\n' +
    '│★ ' + p + 'demote\n' +
    '│★ ' + p + 'gcgc\n' +
    '│★ ' + p + 'gcgc2\n' +
    '│★ ' + p + 'groupinfo\n' +
    '│★ ' + p + 'hidetag\n' +
    '│★ ' + p + 'kick\n' +
    '│★ ' + p + 'link\n' +
    '│★ ' + p + 'members\n' +
    '│★ ' + p + 'poll\n' +
    '│★ ' + p + 'promote\n' +
    '│★ ' + p + 'setdesc\n' +
    '│★ ' + p + 'setgpp\n' +
    '│★ ' + p + 'setgroupname\n' +
    '│★ ' + p + 'stalk\n' +
    '│★ ' + p + 'tagall\n' +
    '│★ ' + p + 'warn\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 7. FUN ────────────────────────────────────────────
    '╭─┴❍「 🎭 FUN 」❍\n' +
    '│★ ' + p + '8ball\n' +
    '│★ ' + p + 'anime\n' +
    '│★ ' + p + 'compliment\n' +
    '│★ ' + p + 'dare\n' +
    '│★ ' + p + 'didyk\n' +
    '│★ ' + p + 'emojimix\n' +
    '│★ ' + p + 'fact\n' +
    '│★ ' + p + 'flirt\n' +
    '│★ ' + p + 'goodnight\n' +
    '│★ ' + p + 'joke\n' +
    '│★ ' + p + 'meme\n' +
    '│★ ' + p + 'quote\n' +
    '│★ ' + p + 'rate\n' +
    '│★ ' + p + 'roast\n' +
    '│★ ' + p + 'truth\n' +
    '│★ ' + p + 'wasted\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 8. GAME ───────────────────────────────────────────
    '╭─┴❍「 🎮 GAME 」❍\n' +
    '│★ ' + p + 'coin\n' +
    '│★ ' + p + 'dice\n' +
    '│★ ' + p + 'guess\n' +
    '│★ ' + p + 'move\n' +
    '│★ ' + p + 'quiz\n' +
    '│★ ' + p + 'rps\n' +
    '│★ ' + p + 'tictactoe\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 9. ECONOMY ────────────────────────────────────────
    '╭─┴❍「 💰 ECONOMY 」❍\n' +
    '│★ ' + p + 'balance\n' +
    '│★ ' + p + 'daily\n' +
    '│★ ' + p + 'leaderboard\n' +
    '│★ ' + p + 'rob\n' +
    '│★ ' + p + 'transfer\n' +
    '│★ ' + p + 'work\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 10. TOOLS ─────────────────────────────────────────
    '╭─┴❍「 🛠️ TOOLS 」❍\n' +
    '│★ ' + p + 'base64\n' +
    '│★ ' + p + 'binary\n' +
    '│★ ' + p + 'calculate\n' +
    '│★ ' + p + 'genpass\n' +
    '│★ ' + p + 'morse\n' +
    '│★ ' + p + 'qrcode\n' +
    '│★ ' + p + 'steal\n' +
    '│★ ' + p + 'sticker\n' +
    '│★ ' + p + 'take\n' +
    '│★ ' + p + 'toimage\n' +
    '│★ ' + p + 'tovideo\n' +
    '│★ ' + p + 'upload\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 11. DOWNLOADER ────────────────────────────────────
    '╭─┴❍「 ⬇️ DOWNLOADER 」❍\n' +
    '│★ ' + p + 'facebook\n' +
    '│★ ' + p + 'iplay\n' +
    '│★ ' + p + 'iplay2\n' +
    '│★ ' + p + 'play\n' +
    '│★ ' + p + 'play2\n' +
    '│★ ' + p + 'song\n' +
    '│★ ' + p + 'song2\n' +
    '│★ ' + p + 'tiktok\n' +
    '│★ ' + p + 'video\n' +
    '│★ ' + p + 'video2\n' +
    '╰─┬────────❍\n' +
    '\n' +

    // ── 12. STATUS ────────────────────────────────────────
    '╭─┴❍「 👁️ STATUS 」❍\n' +
    '│★ ' + p + 'fetch\n' +
    '│★ ' + p + 'fetch2\n' +
    '│★ ' + p + 'save\n' +
    '│★ ' + p + 'save2\n' +
    '│★ ' + p + 'vv\n' +
    '│★ ' + p + 'vv2\n' +
    '╰─┬────────❍\n' +
    '\n' +
    '> *🤖 ' + botName + '* | Made With Love By Admin Blue'

  const mentions = [sender]
  if (ownerJid) mentions.push(ownerJid)

  try {
    if (fs.existsSync(LOCAL_IMAGE)) {
      await sock.sendMessage(jid, {
        image:    fs.readFileSync(LOCAL_IMAGE),
        caption:  help,
        mentions,
      }, { quoted: msg })
    } else {
      await sock.sendMessage(jid, {
        text:     help,
        mentions,
      }, { quoted: msg })
    }
  } catch (_) {
    await sock.sendMessage(jid, {
      text:     help,
      mentions,
    }, { quoted: msg })
  }
}
