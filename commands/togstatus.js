// ============================================================
//  VANGUARD MD — commands/togstatus.js
//  Group Status / Text Status / Media Status
//  Owner can use even if not admin; others must be admins
// ============================================================

const crypto = require('crypto')
const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  downloadContentFromMessage,
} = require('@whiskeysockets/baileys')

const { PassThrough } = require('stream')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegStatic = require('ffmpeg-static')
const { isSenderAdmin } = require('../lib/utils')

// Use bundled ffmpeg if available
try {
  if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic)
} catch (_) {}

const PURPLE_COLOR = '#9C27B0'
const DEFAULT_CAPTION = '_Vanguard MD is on Fire 🔥_'

module.exports = async (ctx) => {
  const { reply, sock, jid, fromGroup, sender, msg, quoted, args, isSudo } = ctx

  if (!fromGroup) return reply('❌ This command can only be used in groups!')

  // Owner can use even if not admin; all others must be admins
  const senderIsAdmin = await isSenderAdmin(sock, jid, sender)
  if (!isSudo && !senderIsAdmin) return reply('❌ Only admins can use this command!')

  // User's typed text takes PRIORITY over everything
  const userText = args.join(' ').trim()

  try {
    const ctxInfo = msg.message?.extendedTextMessage?.contextInfo
    const quotedMsg = ctxInfo?.quotedMessage || quoted?.message || null
    const hasQuoted = !!quotedMsg

    // ── TEXT STATUS ─────────────────────────────────────────
    if (!hasQuoted) {
      if (!userText) {
        return reply(
          '📝 *Group Status Usage*\n\n' +
          '• Reply to image/video with:\n' +
          '  `.togstatus [optional caption]`\n' +
          '• Or send text only:\n' +
          '  `.togstatus Your text here`\n\n' +
          'Text statuses use a purple background by default.\n\n' +
          '💡 *Priority:* Your typed text > quoted caption > default'
        )
      }

      await reply('⏳ Posting text group status...')

      await groupStatus(sock, jid, {
        text: userText,
        backgroundColor: PURPLE_COLOR,
      })

      return reply('✅ Text group status posted!')
    }

    const mtype = Object.keys(quotedMsg)[0] || ''

    // ── IMAGE ───────────────────────────────────────────────
    if (/image/i.test(mtype)) {
      await reply('⏳ Posting image group status...')

      const buf = await downloadMedia(quotedMsg, 'image')
      if (!buf) return reply('❌ Could not download image.')

      // PRIORITY: userText > quoted caption > default
      const quotedCaption = quotedMsg.imageMessage?.caption || ''
      const finalCaption = userText || quotedCaption || DEFAULT_CAPTION

      await groupStatus(sock, jid, {
        image: buf,
        caption: finalCaption,
      })

      return reply('✅ Image group status posted!')
    }

    // ── VIDEO ───────────────────────────────────────────────
    if (/video/i.test(mtype)) {
      await reply('⏳ Posting video group status...')

      const buf = await downloadMedia(quotedMsg, 'video')
      if (!buf) return reply('❌ Could not download video.')

      // PRIORITY: userText > quoted caption > default
      const quotedCaption = quotedMsg.videoMessage?.caption || ''
      const finalCaption = userText || quotedCaption || DEFAULT_CAPTION

      await groupStatus(sock, jid, {
        video: buf,
        caption: finalCaption,
      })

      return reply('✅ Video group status posted!')
    }

    // ── AUDIO / VOICE ───────────────────────────────────────
    // Audio NEVER gets captions, even if user begs
    if (/audio/i.test(mtype)) {
      await reply('⏳ Posting audio group status...')

      const buf = await downloadMedia(quotedMsg, 'audio')
      if (!buf) return reply('❌ Could not download audio.')

      let vn
      try {
        vn = await toVN(buf)
      } catch (e) {
        console.error('toVN failed:', e)
        vn = buf
      }

      let waveform
      try {
        waveform = await generateWaveform(buf)
      } catch (e) {
        console.error('waveform failed:', e)
        waveform = undefined
      }

      await groupStatus(sock, jid, {
        audio: vn,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        waveform,
        // NO caption property - audio doesn't get captions
      })

      return reply('✅ Audio group status posted!')
    }

    // ── STICKER ────────────────────────────────────────────
    // Stickers NEVER get captions, they're pure visual emotion
    if (/sticker/i.test(mtype)) {
      await reply('⏳ Posting sticker group status...')

      const buf = await downloadMedia(quotedMsg, 'sticker')
      if (!buf) return reply('❌ Could not download sticker.')

      await groupStatus(sock, jid, {
        image: buf,
        // NO caption - stickers speak for themselves
      })

      return reply('✅ Sticker group status posted!')
    }

    return reply('❌ Unsupported media type. Reply to an image, video, audio, or sticker.')
  } catch (e) {
    console.error('togstatus command error:', e)
    return reply('❌ Error: ' + (e.message || e))
  }
}

// ---------- Helpers ----------

async function downloadMedia(msg, type) {
  const mediaMsg = msg[`${type}Message`] || msg
  const stream = await downloadContentFromMessage(mediaMsg, type)

  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

async function groupStatus(sock, jid, content) {
  const { backgroundColor } = content
  delete content.backgroundColor

  const inside = await generateWAMessageContent(content, {
    upload: sock.waUploadToServer,
    backgroundColor: backgroundColor || PURPLE_COLOR,
  })

  const secret = crypto.randomBytes(32)

  const msg = generateWAMessageFromContent(
    jid,
    {
      messageContextInfo: { messageSecret: secret },
      groupStatusMessageV2: {
        message: {
          ...inside,
          messageContextInfo: { messageSecret: secret },
        },
      },
    },
    {}
  )

  await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
  return msg
}

async function toVN(buffer) {
  return new Promise((resolve, reject) => {
    const input = new PassThrough()
    const output = new PassThrough()
    const chunks = []

    output.on('data', (chunk) => chunks.push(chunk))
    output.on('end', () => resolve(Buffer.concat(chunks)))
    output.on('error', reject)

    input.end(buffer)

    ffmpeg(input)
      .noVideo()
      .audioCodec('libopus')
      .audioChannels(1)
      .audioFrequency(48000)
      .format('ogg')
      .on('error', reject)
      .pipe(output, { end: true })
  })
}

async function generateWaveform(buffer, bars = 64) {
  return new Promise((resolve, reject) => {
    const input = new PassThrough()
    const output = new PassThrough()
    const chunks = []

    output.on('data', (chunk) => chunks.push(chunk))
    output.on('error', reject)

    output.on('end', () => {
      try {
        const raw = Buffer.concat(chunks)
        if (!raw.length) return resolve(undefined)

        const sampleCount = Math.floor(raw.length / 2)
        if (sampleCount <= 0) return resolve(undefined)

        const amplitudes = []
        for (let i = 0; i < sampleCount; i++) {
          const offset = i * 2
          amplitudes.push(Math.abs(raw.readInt16LE(offset)) / 32768)
        }

        const size = Math.floor(amplitudes.length / bars)
        if (size <= 0) return resolve(undefined)

        const barsData = Array.from({ length: bars }, (_, i) => {
          const slice = amplitudes.slice(i * size, (i + 1) * size)
          if (!slice.length) return 0
          return slice.reduce((a, b) => a + b, 0) / slice.length
        })

        const max = Math.max(...barsData)
        if (!max) return resolve(undefined)

        const normalized = barsData.map(v => Math.max(0, Math.min(100, Math.floor((v / max) * 100))))
        resolve(Buffer.from(normalized).toString('base64'))
      } catch (err) {
        reject(err)
      }
    })

    input.end(buffer)

    ffmpeg(input)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .format('s16le')
      .on('error', reject)
      .pipe(output, { end: true })
  })
}
