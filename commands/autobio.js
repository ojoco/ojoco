// ============================================================
//  VANGUARD MD — commands/autobio.js
// ============================================================

const fs   = require('fs')
const path = require('path')
const config   = require('../config')
const defaults = require('../defaults')

const QUOTES_FILE = path.join(__dirname, '..', 'data', 'quotes.json')
const INTERVAL_MS = 30000  // 30 seconds

// ── Single interval ref — prevent stacking on repeat calls ───
let bioInterval = null

// ── Load quotes ───────────────────────────────────────────────
const loadQuotes = () => {
  try {
    if (fs.existsSync(QUOTES_FILE)) {
      return JSON.parse(fs.readFileSync(QUOTES_FILE, 'utf8'))
    }
  } catch (_) {}
  return []
}

// ── Format timestamp ──────────────────────────────────────────
const getTimestamp = () => {
  const now  = new Date()
  const h    = now.getHours()
  const m    = now.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12  = (h % 12 || 12)
  const day  = now.getDate().toString().padStart(2, '0')
  const mon  = (now.getMonth() + 1).toString().padStart(2, '0')
  const yr   = now.getFullYear().toString().slice(2)
  return `${h12}:${m}${ampm} ${day}/${mon}/${yr}`
}

// ── Update bio once ───────────────────────────────────────────
const updateBio = async (sock) => {
  try {
    const quotes = loadQuotes()
    if (!quotes.length) return

    const q       = quotes[Math.floor(Math.random() * quotes.length)]
    const botName = config.botName || defaults.botName || 'VANGUARD MD'
    const bio     = `${botName} 🤖 ${getTimestamp()} : "${q.quote}"`

    // ── Trim to WhatsApp 139 char bio limit ───────────────────
    const trimmed = bio.length > 139 ? bio.slice(0, 136) + '...' : bio

    await sock.updateProfileStatus(trimmed)
  } catch (_) {}
}

// ── Start autobio loop ────────────────────────────────────────
const startAutoBio = (sock) => {
  if (bioInterval) clearInterval(bioInterval)
  updateBio(sock)  // fire immediately
  bioInterval = setInterval(() => updateBio(sock), INTERVAL_MS)
}

// ── Stop autobio loop ─────────────────────────────────────────
const stopAutoBio = () => {
  if (bioInterval) {
    clearInterval(bioInterval)
    bioInterval = null
  }
}

// ── Command ───────────────────────────────────────────────────
module.exports = async (ctx) => {
  const { reply, args, isSudo, sock } = ctx
  if (!isSudo) return reply('❌ Owner/sudo only!')

  const state = args[0]?.toLowerCase()

  if (!state || !['on', 'off'].includes(state)) {
    const cur = config.autoBio ?? false
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 📝 *AUTO BIO*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ 📍 *Current:* ' + (cur ? 'ON ✅' : 'OFF ❌') + '\n' +
      '┃\n' +
      '┃ *Usage:* .autobio on/off\n' +
      '┃\n' +
      '┃ _Updates bio every 30s with_\n' +
      '┃ _a random quote + timestamp_\n' +
      '┃\n' +
      '┃ *Format:*\n' +
      '┃ _BotName 🤖 12:14am 19/03/26 : "quote"_\n' +
      '╰───────────────━⊷'
    )
  }

  if (state === 'on') {
    config.autoBio = true
    startAutoBio(sock)
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 📝 *AUTO BIO*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ ✅ *ON* — Bio updating every 30s!\n' +
      '┃ _Random quotes with timestamp_\n' +
      '╰───────────────━⊷'
    )
  }

  // ── OFF ───────────────────────────────────────────────────
  config.autoBio = false
  stopAutoBio()
  return reply(
    '╭───────────────━⊷\n' +
    '┃ 📝 *AUTO BIO*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    '┃ ❌ *OFF* — Bio updates stopped\n' +
    '╰───────────────━⊷'
  )
}

// ── Export for index.js to restart on reconnect ───────────────
module.exports.startAutoBio = startAutoBio
module.exports.stopAutoBio  = stopAutoBio
