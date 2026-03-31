// ============================================================
//  VANGUARD MD — commands/statusemoji.js
// ============================================================

const config   = require('../config')
const defaults = require('../defaults')

// ── Split into visible grapheme clusters ─────────────────────
const splitGraphemes = (str) => {
  if (!str) return []
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const seg = new Intl.Segmenter('en', { granularity: 'grapheme' })
      return [...seg.segment(str)].map(s => s.segment)
    }
  } catch (_) {}
  return [...str]
}

const hasEmojiProperty = (char) => {
  try {
    return (
      /\p{Extended_Pictographic}/u.test(char) ||
      /\p{Emoji_Presentation}/u.test(char) ||
      /\p{Emoji}/u.test(char)
    )
  } catch (_) {
    return false
  }
}

const analyzeEmoji = (input) => {
  if (!input || typeof input !== 'string') {
    return { valid: false, reason: 'empty input' }
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return { valid: false, reason: 'empty input' }
  }

  const visible = splitGraphemes(trimmed).filter(s => !/^\s+$/.test(s))

  // Must be exactly one visible grapheme
  if (visible.length !== 1) {
    return { valid: false, reason: 'multiple characters or emojis' }
  }

  const char = visible[0]
  const codepoints = [...char].map(c => c.codePointAt(0))

  // Reject ZWJ sequences (family, mixed emojis, etc.)
  if (codepoints.includes(0x200D)) {
    return { valid: false, reason: 'ZWJ sequence' }
  }

  // Reject skin tone modifiers
  if (codepoints.some(cp => cp >= 0x1F3FB && cp <= 0x1F3FF)) {
    return { valid: false, reason: 'skin tone modifier' }
  }

  // Reject keycap sequences
  if (codepoints.includes(0x20E3)) {
    return { valid: false, reason: 'keycap sequence' }
  }

  // Reject flags / regional indicators
  if (codepoints.some(cp => cp >= 0x1F1E6 && cp <= 0x1F1FF)) {
    return { valid: false, reason: 'flag sequence' }
  }

  // Must be a real emoji-like grapheme
  if (!hasEmojiProperty(char)) {
    return { valid: false, reason: 'not a valid emoji' }
  }

  return { valid: true, emoji: char }
}

module.exports = async (ctx) => {
  const { reply, args, isSudo } = ctx

  if (!isSudo) return reply('❌ Only sudo/owner can use this command!')

  if (!args.length) {
    const current = (config.statusEmojis || defaults.statusEmojis || []).join(' ')
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 😀 *STATUS EMOJIS*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ 📍 *Current:* ' + (current || 'None') + '\n' +
      '┃\n' +
      '┃ 💡 Usage: *.statusemoji 💙 💚 🔥*\n' +
      '┃ ⚠️ Max 30 emojis\n' +
      '┃ ❌ No skin tones, ZWJ, flags or keycaps\n' +
      '╰───────────────━⊷'
    )
  }

  const allInput = args.join(' ').trim()
  const graphemes = splitGraphemes(allInput).filter(s => !/^\s+$/.test(s))

  const newEmojis = []
  const rejected  = []

  for (const item of graphemes) {
    const result = analyzeEmoji(item)

    if (result.valid) {
      if (!newEmojis.includes(result.emoji)) {
        newEmojis.push(result.emoji)
      }
    } else {
      rejected.push(`${item} (${result.reason})`)
    }
  }

  if (!newEmojis.length) {
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 😀 *STATUS EMOJIS*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ ❌ *No valid emojis provided!*\n' +
      (rejected.length ? '┃ ⚠️ *Rejected:* ' + rejected.join(' | ') + '\n' : '') +
      '┃\n' +
      '┃ 💡 Use pure solo emojis like: 💙 💚 😂 🔥 😍 ❤️\n' +
      '┃ ❌ No skin tones, flags, family emojis or 1️⃣ type\n' +
      '╰───────────────━⊷'
    )
  }

  if (newEmojis.length > 30) {
    return reply(
      '╭───────────────━⊷\n' +
      '┃ 😀 *STATUS EMOJIS*\n' +
      '╰───────────────━⊷\n' +
      '╭───────────────━⊷\n' +
      '┃ ❌ Maximum *30 emojis* allowed!\n' +
      '┃ ✅ *Valid:* ' + newEmojis.join(' ') + '\n' +
      (rejected.length ? '┃ ⚠️ *Rejected:* ' + rejected.join(' | ') + '\n' : '') +
      '╰───────────────━⊷'
    )
  }

  config.statusEmojis = newEmojis

  await reply(
    '╭───────────────━⊷\n' +
    '┃ 😀 *STATUS EMOJIS UPDATED*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    '┃ ✅ *New Emojis:* ' + newEmojis.join(' ') + '\n' +
    (rejected.length ? '┃ ⚠️ *Rejected:* ' + rejected.join(' | ') + '\n' : '') +
    '┃\n' +
    '┃ 💡 Bot will now react to statuses with these emojis\n' +
    '╰───────────────━⊷'
  )
}