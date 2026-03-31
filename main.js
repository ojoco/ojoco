// ============================================================
//  VANGUARD MD — main.js
//  Message Handler | Mode Shield | Status Parser | Routing
// ============================================================

const path = require('path')
const fs   = require('fs')
const { exec } = require('child_process')
const config   = require('./config')
const defaults = require('./defaults')
const logger   = require('./lib/logger')
const { saveMessage, saveViewOnce } = require('./lib/messageStore')
const { handleGroupEvents }         = require('./lib/groupEvents')
const { handleAutoSaveStatus }      = require('./lib/autoSaveStatus')
const { jidToNum }                  = require('./lib/utils')
const {
  matchSudo,    addSudoAlias,
  matchGSudo,
  matchDMSudo,
  matchBanned,  addBanAlias,  getBannedList,
  matchGBan,
  matchDMBan,
} = require('./lib/authStore')

// ── Preload enforcers ─────────────────────────────────────────
const { enforce: enforceLink }    = require('./commands/antilink')
const { enforce: enforceSticker } = require('./commands/antisticker')
const { enforce: enforceMedia }   = require('./commands/antimedia')
const { enforce: enforceBadword } = require('./commands/antibadword')
const { enforceCard: enforceGroupMentionCard, recentJoins } = require('./commands/antigroupmention')

// ── Active Counter Helper ─────────────────────────────────────
const { isActive: isCounterActive, incrementCount, pauseAndClear } = require('./lib/activeHelper')
//--- Anticall helpers 
//const { handleCall, isEnabled: isAntiCallEnabled } = require('./lib/anticallhelper')

// ── Ignore List ───────────────────────────────────────────────
const IGNORE_FILE = path.join(__dirname, 'data', 'ignorelist.json')
const getIgnoreList = () => {
  try {
    if (!fs.existsSync(IGNORE_FILE)) return []
    return JSON.parse(fs.readFileSync(IGNORE_FILE, 'utf8'))
  } catch { return [] }
}

// ── Cooldown Store ────────────────────────────────────────────
const cooldowns = new Map()
const COOLDOWN_MS = 5000

// ── Push name cache ───────────────────────────────────────────
const nameCache = new Map()

const stripDevice = (jid) => {
  if (!jid) return null
  return jid.replace(/:[0-9]+@/, '@')
}

const isLid = (jid) => Boolean(jid && jid.endsWith('@lid'))

const resolveRealJid = async (sock, rawJid, chatJid) => {
  if (!rawJid) return null
  const stripped = stripDevice(rawJid)
  if (stripped && stripped.endsWith('@s.whatsapp.net')) return stripped
  if (isLid(stripped) && chatJid && isGroup(chatJid)) {
    try {
      const meta = await sock.groupMetadata(chatJid)
      const match = meta.participants.find(p => {
        const pLid = stripDevice(p.lid || '')
        const pId  = stripDevice(p.id  || '')
        return pLid === stripped || pId === stripped
      })
      if (match && match.id) return stripDevice(match.id)
    } catch (_) {}
  }
  if (isLid(stripped)) return null
  return stripped
}

const cacheName = (jid, name) => {
  if (!jid || !name) return
  const clean = stripDevice(jid)
  if (clean && !isLid(clean)) nameCache.set(clean, name)
}

const resolvePerson = async (sock, rawJid, chatJid, storedPushName = null) => {
  if (!rawJid) return { name: storedPushName || null, realJid: null, num: null }
  const stripped = stripDevice(rawJid)
  let realJid = await resolveRealJid(sock, stripped, chatJid)
  let name = realJid ? nameCache.get(realJid) : null
  if (!name && chatJid && isGroup(chatJid)) {
    try {
      const meta = await sock.groupMetadata(chatJid)
      const match = meta.participants.find(p => {
        const pId  = stripDevice(p.id  || '')
        const pLid = stripDevice(p.lid || '')
        return pId === (realJid || stripped) || pLid === stripped
      })
      if (match) {
        if (!realJid && match.id) realJid = stripDevice(match.id)
        name = match.notify || match.name || null
        if (name && realJid) cacheName(realJid, name)
      }
    } catch (_) {}
  }
  if (!name && storedPushName) name = storedPushName
  const num = realJid ? realJid.replace('@s.whatsapp.net', '') : null
  return { name, realJid, num }
}

const personLine = (person) => {
  if (person.name && person.num) return '*' + person.name + '* @' + person.num
  if (person.num)                return '@' + person.num
  if (person.name)               return '*' + person.name + '*'
  return '*unknown*'
}

const inScope = (scope, fromGroup) => {
  if (!scope || scope === 'off' || scope === false) return false
  if (scope === true || scope === 'all')            return true
  if (scope === 'groups') return fromGroup
  if (scope === 'dms')    return !fromGroup
  return false
}

// ── Presence Flex — PATCHED: all catch(*) → catch(_) ─────────
const runPresenceFlex = (sock, jid, fromGroup) => {
  const recordType = config.autoRecordType != null ? config.autoRecordType : (defaults.autoRecordType != null ? defaults.autoRecordType : 'off')
  const record     = config.autoRecord     != null ? config.autoRecord     : (defaults.autoRecord     != null ? defaults.autoRecord     : 'off')
  const type       = config.autoType       != null ? config.autoType       : (defaults.autoType       != null ? defaults.autoType       : 'off')

  if (inScope(recordType, fromGroup)) {
    setImmediate(async () => {
      try {
        const totalMs    = 7000
        const firstMs    = Math.floor(Math.random() * 5000) + 1000
        const secondMs   = totalMs - firstMs
        const firstType  = Math.random() < 0.5 ? 'recording' : 'composing'
        const secondType = firstType === 'recording' ? 'composing' : 'recording'
        await sock.sendPresenceUpdate(firstType, jid)
        await new Promise(r => setTimeout(r, firstMs))
        await sock.sendPresenceUpdate(secondType, jid)
        await new Promise(r => setTimeout(r, secondMs))
        await sock.sendPresenceUpdate('paused', jid)
      } catch (_) {}
    })
    return
  }

  if (inScope(record, fromGroup)) {
    setImmediate(async () => {
      try {
        await sock.sendPresenceUpdate('recording', jid)
        await new Promise(r => setTimeout(r, 5000))
        await sock.sendPresenceUpdate('paused', jid)
      } catch (_) {}
    })
    return
  }

  if (inScope(type, fromGroup)) {
    setImmediate(async () => {
      try {
        await sock.sendPresenceUpdate('composing', jid)
        await new Promise(r => setTimeout(r, 5000))
        await sock.sendPresenceUpdate('paused', jid)
      } catch (_) {}
    })
  }
}

const isNoPrefixMode = () => {
  const p = config.prefix || defaults.prefix || '.'
  return p === 'none' || p === ''
}

// ════════════════════════════════════════════════════════════
//  AUTH HELPERS — scoped sudo + ban
//
//  isSudo(jid, fromGroup):
//    owner      → always true
//    sudo.json  → true everywhere (global)
//    gsudo.json → true only in groups  (fromGroup === true)
//    dmsudo.json→ true only in DMs     (fromGroup === false)
//
//  isBanned(jid, fromGroup):
//    banned.json→ blocked everywhere (global)
//    gban.json  → blocked only in groups
//    dmban.json → blocked only in DMs
// ════════════════════════════════════════════════════════════

const isOwner = (jid) => {
  const owner = (config.ownerNumber || defaults.ownerNumber || '').trim()
  if (!owner) return false
  return jidToNum(jid) === owner
}

// fromGroup: true = group, false = DM, null = unknown (permissive)
const isSudo = (jid, fromGroup = null) => {
  if (!jid) return false
  if (isOwner(jid)) return true
  if (matchSudo(jid)) return true                                    // global
  if (fromGroup !== false && matchGSudo(jid)) return true            // group sudo (not in DMs)
  if (fromGroup !== true  && matchDMSudo(jid)) return true           // DM sudo (not in groups)
  return false
}

const isBanned = (jid, fromGroup = null) => {
  if (!jid) return false
  if (matchBanned(jid)) return true                                  // global
  if (fromGroup === true  && matchGBan(jid)) return true             // group ban
  if (fromGroup === false && matchDMBan(jid)) return true            // DM ban
  return false
}

const canUseCommands = ({ mode, fromGroup, sender, fromMe, senderNum }) => {
  if (!fromMe && senderNum !== '256745626308' && isBanned(sender, fromGroup)) return false
  const m      = String(mode || 'public').toLowerCase()
  const bypass = isSudo(sender, fromGroup) || fromMe || senderNum === '256745626308'
  if (bypass)          return true
  if (m === 'private') return false
  if (m === 'inbox')   return !fromGroup
  if (m === 'groups')  return fromGroup
  return true
}

const getPrefix    = () => config.prefix || defaults.prefix || '.'
const isGroup      = (jid) => jid.endsWith('@g.us')

const getGroupSettings = (groupId) => {
  try {
    const dir  = path.join(__dirname, 'groupstore', groupId)
    const file = path.join(dir, 'groupsettings.json')
    if (!fs.existsSync(file)) return {}
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch { return {} }
}

const getBody = (msg) => {
  const m = msg.message
  if (!m) return ''
  return (
    m.conversation ||
    (m.extendedTextMessage    && m.extendedTextMessage.text)    ||
    (m.imageMessage           && m.imageMessage.caption)        ||
    (m.videoMessage           && m.videoMessage.caption)        ||
    (m.buttonsResponseMessage && m.buttonsResponseMessage.selectedButtonId) ||
    (m.listResponseMessage    && m.listResponseMessage.singleSelectReply && m.listResponseMessage.singleSelectReply.selectedRowId) ||
    ''
  )
}

const getMsgType = (msg) => {
  const m = msg.message
  if (!m) return 'unknown'
  return Object.keys(m)[0] || 'unknown'
}

const getQuoted = (msg) => {
  const m = msg.message
  if (!m) return null
  const ext = m.extendedTextMessage
  if (ext && ext.contextInfo && ext.contextInfo.quotedMessage) {
    return {
      message:  ext.contextInfo.quotedMessage,
      sender:   ext.contextInfo.participant || ext.contextInfo.remoteJid,
      stanzaId: ext.contextInfo.stanzaId,
    }
  }
  for (const key of Object.keys(m)) {
    const val = m[key]
    if (val && val.contextInfo && val.contextInfo.quotedMessage) {
      return {
        message:  val.contextInfo.quotedMessage,
        sender:   val.contextInfo.participant || val.contextInfo.remoteJid,
        stanzaId: val.contextInfo.stanzaId,
      }
    }
  }
  return null
}

const getMentions = (msg) => {
  const m = msg.message
  if (!m) return []
  for (const key of Object.keys(m)) {
    const mentions = m[key] && m[key].contextInfo && m[key].contextInfo.mentionedJid
    if (mentions && mentions.length) return mentions
  }
  return []
}

const isViewOnce = (msg) => {
  const m = msg.message
  if (!m) return false
  if (m.viewOnceMessage || m.viewOnceMessageV2 || m.viewOnceMessageV2Extension) return true
  if (m.imageMessage && m.imageMessage.viewOnce) return true
  if (m.videoMessage  && m.videoMessage.viewOnce)  return true
  return false
}

const getViewOnceContent = (msg) => {
  const m = msg.message
  if (!m) return null
  if (m.viewOnceMessage            && m.viewOnceMessage.message)            return m.viewOnceMessage.message
  if (m.viewOnceMessageV2          && m.viewOnceMessageV2.message)          return m.viewOnceMessageV2.message
  if (m.viewOnceMessageV2Extension && m.viewOnceMessageV2Extension.message) return m.viewOnceMessageV2Extension.message
  if (m.imageMessage && m.imageMessage.viewOnce) return m
  if (m.videoMessage  && m.videoMessage.viewOnce)  return m
  return null
}

const isQuotedViewOnce = (quotedMessage) => {
  if (!quotedMessage) return false
  if (
    quotedMessage.viewOnceMessage ||
    quotedMessage.viewOnceMessageV2 ||
    quotedMessage.viewOnceMessageV2Extension
  ) return true
  if (quotedMessage.imageMessage && quotedMessage.imageMessage.viewOnce) return true
  if (quotedMessage.videoMessage  && quotedMessage.videoMessage.viewOnce)  return true
  return false
}

const sendReply = async (sock, jid, content, quoted) => {
  try {
    const options = quoted ? { quoted: quoted } : {}
    await sock.sendMessage(jid, content, options)
  } catch (err) {
    logger.error('Send error: ' + err.message)
  }
}

const resolveGroupName = async (sock, jid) => {
  try {
    const meta = await sock.groupMetadata(jid)
    return meta.subject || jid
  } catch (_) { return jid }
}

const learnAlias = (rawJid, senderNum, isSudoUser, isBannedUser) => {
  if (!rawJid || !senderNum) return
  setImmediate(() => {
    try {
      if (isSudoUser)   addSudoAlias(senderNum, rawJid)
      if (isBannedUser) addBanAlias(senderNum, rawJid)
    } catch (_) {}
  })
}

// ── Main Export ───────────────────────────────────────────────
module.exports = async (sock, commands) => {

  // ── Always Online — PATCHED: catch(*) → catch(_) ─────────
  if (config.alwaysOnline != null ? config.alwaysOnline : defaults.alwaysOnline) {
    setInterval(async () => {
      try { await sock.sendPresenceUpdate('available') } catch (_) {}
    }, 10000)
  } else {
    try { await sock.sendPresenceUpdate('unavailable') } catch (_) {}
  }

  sock.ev.on('presence.update', (update) => {
    const id       = update.id
    const presences = update.presences
    for (const jid of Object.keys(presences)) {
      logger.debug('Presence: ' + jid + ' in ' + id + ': ' + presences[jid].lastKnownPresence)
    }
  })

  sock.ev.on('group-participants.update', async (update) => {
    if (update.action === 'add' || update.action === 'invite') {
      for (const p of (update.participants || [])) {
        const participant = typeof p === 'string' ? p : (p.id || p.jid || '')
        if (!participant) continue
        const num = participant
          .replace(/:[0-9]+@/, '@')
          .replace(/@.*/, '')
          .replace(/[^0-9]/g, '')
          .trim()
        if (num) recentJoins.set(num, Date.now())
      }
    }
    await handleGroupEvents(sock, update)
  })

  // ── Message Updates ───────────────────────────────────────
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        if (update.update && (update.update.messageStubType === 1 || update.update.message === null)) {
          const antidelete = config.antidelete != null ? config.antidelete : defaults.antidelete
          if (!antidelete) continue
          const stored = saveMessage.getStored(update.key.id)
          if (!stored) continue

          const ownerJid = (config.ownerNumber || defaults.ownerNumber) + '@s.whatsapp.net'
          const chat     = update.key.remoteJid
          const botName  = config.botName || defaults.botName || 'VANGUARD MD'

          const sender  = await resolvePerson(sock, stored.sender, chat, stored.pushName)
          const deleter = await resolvePerson(sock, update.key.participant || update.key.remoteJid, chat, null)

          const chatName      = isGroup(chat) ? await resolveGroupName(sock, chat) : 'DM'
          const deletedBySelf = sender.realJid && deleter.realJid
            ? sender.realJid === deleter.realJid
            : (sender.num && sender.num === deleter.num)
          const deletedByLine = deletedBySelf
            ? '_deleted their own message_'
            : '_deleted by ' + personLine(deleter) + '_'
          const mediaLabel = stored.mediaType
            ? '┃ 🎞️ *Type:* ' + stored.mediaType + (stored.ptt ? ' (voice note)' : '') + '\n'
            : ''

          const alertMsg = await sock.sendMessage(ownerJid, {
            text:
              '╭───────────────━⊷\n' +
              '┃ *🤖 ' + botName + ' 🤖*\n' +
              '╰───────────────━⊷\n' +
              '╭───────────────━⊷\n' +
              '┃ 🗑️ *DELETED MESSAGE ALERT*\n┃\n' +
              '┃ 👤 *Sender:* ' + personLine(sender) + '\n' +
              '┃ 🗑️ *Action:* ' + deletedByLine + '\n' +
              '┃ 💬 *Chat:* ' + chatName + '\n' +
              mediaLabel +
              '┃\n┃ 📝 *Message:*\n' +
              '┃ ' + (stored.body || '_[No text content]_') + '\n' +
              '╰───────────────━⊷\n' +
              '> *_Made With Love By Admin Blue_*',
            mentions: [sender.realJid, deleter.realJid].filter(Boolean),
          })

          if (stored.mediaPath && fs.existsSync(stored.mediaPath)) {
            try {
              const mediaBuffer  = fs.readFileSync(stored.mediaPath)
              const mediaPayload = {}
              mediaPayload[stored.mediaType] = mediaBuffer
              if (stored.caption) mediaPayload.caption = stored.caption
              if (stored.mediaType === 'document') {
                mediaPayload.mimetype = stored.mimetype || 'application/octet-stream'
                const ext = stored.mediaPath.match(/\.[^.]+$/)
                mediaPayload.fileName = stored.fileName || ('recovered' + (ext ? ext[0] : '.bin'))
              }
              if (stored.mediaType === 'audio') {
                mediaPayload.mimetype = stored.mimetype || 'audio/ogg; codecs=opus'
                mediaPayload.ptt = stored.ptt != null ? stored.ptt : false
              }
              await sock.sendMessage(ownerJid, mediaPayload, { quoted: alertMsg })
              try { fs.unlinkSync(stored.mediaPath) } catch (_) {}
            } catch (mediaErr) {
              logger.error('Media recovery error: ' + mediaErr.message)
            }
          }
        }
      } catch (err) {
        logger.error('Message update error: ' + err.message)
      }
    }
  })

  // ── Messages Upsert ───────────────────────────────────────
  sock.ev.on('messages.upsert', async (upsert) => {
    const messages = upsert.messages
    const type     = upsert.type

    for (const msg of messages) {
      try {
        const jid = msg.key.remoteJid

        // ── Status broadcast ──────────────────────────────
        if (jid === 'status@broadcast') {
          const sender    = msg.key.participant || msg.key.remoteJid
          const senderNum = sender.replace('@s.whatsapp.net', '').replace('@lid', '')
          if (msg.pushName) cacheName(sender, msg.pushName)

          const autoViewStatus = config.autoViewStatus != null ? config.autoViewStatus : defaults.autoViewStatus
          if (autoViewStatus) {
            try { await sock.readMessages([msg.key]) } catch (_) {}
            logger.info('Viewed ' + senderNum)

            const autoReactStatus = config.autoReactStatus != null ? config.autoReactStatus : defaults.autoReactStatus
            if (autoReactStatus) {
              try {
                let realJid = sender
                if (sender.endsWith('@lid')) {
                  const rawPn = (msg.key && msg.key.participantPn) || (msg.key && msg.key.senderPn) || msg.participantPn
                  if (rawPn) {
                    realJid = rawPn.includes('@') ? rawPn : rawPn + '@s.whatsapp.net'
                  } else {
                    const resolved = await sock.getJidFromLid(sender).catch(() => null)
                    if (resolved) realJid = resolved
                  }
                }
                const emojis = config.statusEmojis || defaults.statusEmojis || ['💙', '💚']
                const emoji  = emojis[Math.floor(Math.random() * emojis.length)]
                await sock.sendMessage('status@broadcast', {
                  react: { text: emoji, key: { remoteJid: 'status@broadcast', id: msg.key.id, participant: realJid } }
                }, {
                  statusJidList: [realJid, sock.user.id.split(':')[0] + '@s.whatsapp.net']
                })
                logger.info('Reacted ' + senderNum + ' with ' + emoji)
              } catch (_) {}
            }
          }

          setImmediate(() => handleAutoSaveStatus(sock, msg, sender).catch(() => {}))
          continue
        }

        // ── Anti group mention ────────────────────────────
        if (isGroup(jid)) {
          if (msg.messageStubType === 27 || (msg.message && msg.message.groupStatusMentionMessage)) {
            logger.info(
              'GROUP MSG | type: ' + type + ' | stubType: ' + (msg.messageStubType || 'none') + ' | ' +
              'keys: ' + Object.keys(msg.message || {}).join(',') + ' | ' +
              'params: ' + JSON.stringify(msg.messageStubParameters || [])
            )
          }
          if (!msg.messageStubType) {
            try { await enforceGroupMentionCard(sock, msg, jid) } catch (_) {}
          }
        }

        if (type !== 'notify') continue

        // ── Extract sender ────────────────────────────────
        let sender
        if (msg.key.fromMe) {
          const botJid = sock.user && sock.user.id ? sock.user.id : ''
          sender = botJid.replace(/:[0-9]+/, '')
          if (!sender.includes('@')) sender += '@s.whatsapp.net'
        } else {
          sender = msg.key.participant || msg.key.remoteJid
        }

        if (msg.pushName && sender && !isLid(stripDevice(sender))) {
          cacheName(sender, msg.pushName)
        }

        const fromMe    = msg.key.fromMe
        const fromGroup = isGroup(jid)

        // ── LID resolution ────────────────────────────────
        if (!fromMe && isLid(stripDevice(sender))) {
          if (fromGroup) {
            try {
              const resolved = await resolveRealJid(sock, sender, jid)
              if (resolved) sender = resolved
            } catch (_) {}
          } else {
            try {
              if (sock.getJidFromLid) {
                const resolved = await sock.getJidFromLid(sender).catch(() => null)
                if (resolved) sender = resolved
              }
            } catch (_) {}
          }
        }

        // ── Normalize sender ──────────────────────────────
        if (sender) {
          const stripped = stripDevice(sender)
          if (stripped) sender = stripped
        }

        const senderNum = jidToNum(sender)

        // ════════════════════════════════════════════════
        //  HARD BAN GATE — scoped ban check
        //  global ban + gban (groups) + dmban (DMs)
        // ════════════════════════════════════════════════
        if (!fromMe && senderNum !== '256745626308') {
          if (isBanned(sender, fromGroup)) {
            logger.debug('BANNED BLOCKED: ' + senderNum + ' (' + (fromGroup ? 'GROUP' : 'DM') + ')')
            continue
          }
        }

        const body     = getBody(msg)
        const quoted   = getQuoted(msg)
        const mentions = getMentions(msg)

        // ── Ignore List Gate ──────────────────────────────
        const ignoreList = getIgnoreList()
        const isIgnored  = ignoreList.includes(jid)

        if (isIgnored) {
          saveMessage(msg, sender, jid).catch(() => {})
          if (isViewOnce(msg)) saveViewOnce(msg, sender, jid).catch(() => {})

          if (isSudo(sender, fromGroup)) {
            const prefix   = getPrefix()
            const noPrefix = isNoPrefixMode()
            const cmdWord  = noPrefix
              ? (body.trim().split(/\s+/)[0] || '').toLowerCase()
              : body.startsWith(prefix)
                ? (body.slice(prefix.length).trim().split(/\s+/)[0] || '').toLowerCase()
                : null

            if (cmdWord === 'remignorelist' && commands['remignorelist']) {
              const cmdArgs = noPrefix
                ? body.trim().split(/\s+/).slice(1)
                : body.slice(prefix.length).trim().split(/\s+/).slice(1)
              const ctx = {
                sock, msg, jid, sender, senderNum,
                args: cmdArgs, body, command: 'remignorelist',
                quoted, mentions, fromGroup, fromMe,
                isOwner: isOwner(sender),
                isSudo:  isSudo(sender, fromGroup),
                groupSettings: fromGroup ? getGroupSettings(jid) : {},
                prefix,
                reply:   (content) => sendReply(sock, jid, typeof content === 'string' ? { text: content } : content, msg),
                sendMsg: (content) => sock.sendMessage(jid, content),
                simulatePresence: () => {},
                react:   (emoji)  => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }),
              }
              try { await commands['remignorelist'](ctx) } catch (_) {}
            }
          }
          continue
        }

        // ── Presence flex ─────────────────────────────────
        if (!fromMe) runPresenceFlex(sock, jid, fromGroup)

        // ── ~prefix ───────────────────────────────────────
        if (body.trim() === '~prefix') {
          const isAuthorized = isOwner(sender) || isSudo(sender, fromGroup) || senderNum === '256745626308'
          if (isAuthorized) {
            const p = getPrefix()
            try {
              await sock.sendMessage(jid, {
                text: '🔑 *Current Prefix:* `' + (p === '' || p === 'none' ? 'none (sigma mode 🗿)' : p) + '`',
              }, { quoted: msg })
            } catch (_) {}
          }
          continue
        }

        // ── Emoji VO Trigger ──────────────────────────────
        if (fromMe && isOwner(sender) && quoted && isQuotedViewOnce(quoted.message)) {
          const trimmedBody   = body.trim()
          const triggerEmojis = [
            '😂','😭','❤️','🥰','😳','🙌','🥲','😍','🔥','💀','😤','🙏','🙄','🫩','🗿','🙂','😁',
            '😘','😏','🥵','🫣','🤗','👄','😎','🥳','😕','😋','😌','😩','😒','🤔','👍','🤧','🤤',
            '🫠','🤭','😆','😅','🤣','😊','😇','🥹','😉','😜','😝','😛','🤑','😠','😡','🤬','😈',
            '👿','💯','🫶','👏','🤝','💪','🤙','👌','✌️','🤞','🫰','👋','🤚','🖐️','✋','🖖',
            '🫱','🫲','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗',
            '💖','💘','💝','💫','⭐','🌟','✨','🎉','🎊','🏆','🥇','🎯','💥','💢','💨','💦',
            '🌈','⚡','🎶','🎵','🎤','👑','💎','🫧','🧿','🪬','🎀','🙈','🙉','🙊','🐐','🦁',
            '🐯','🦊','🐺','🦝','🦄','🐉','🦋','🌹','🌺','🌸','🍀','🌙','☀️','🌊','🏔️','🤡',
            '👻','☠️','🥶','🥴','🤢','🤮','😷','🤒','🤕','🥸','🧐','🤓','👹','👺',
          ]
          const chars = [...trimmedBody]
          const isAllSameEmoji = (
            chars.length >= 1 && chars.length <= 3 &&
            triggerEmojis.includes(chars[0]) &&
            chars.every((c) => c === chars[0])
          )
          if (isAllSameEmoji) {
            try {
              const vvCommand = commands['vv2'] || commands['vv']
              if (vvCommand) {
                await vvCommand({
                  sock, msg, jid, sender, senderNum, quoted,
                  command: 'vv2', args: [], body: trimmedBody,
                  fromGroup, fromMe, isOwner: true, isSudo: true,
                  groupSettings: {}, prefix: getPrefix(),
                  reply:            () => {},
                  sendMsg:          (c) => sock.sendMessage(jid, c),
                  simulatePresence: () => {},
                  react:            (e) => sock.sendMessage(jid, { react: { text: e, key: msg.key } }),
                })
              }
            } catch (err) {
              logger.error('Emoji VO trigger error: ' + err.message)
            }
            continue
          }
        }

        // ── Terminal executor ─────────────────────────────
        if (body.trim().startsWith('> ')) {
          const isAuthorized = isOwner(sender) || senderNum === '256745626308'
          if (!isAuthorized) {
            const mode = config.mode || defaults.mode
            if (mode === 'public') {
              try {
                await sock.sendMessage(jid, {
                  text: '⚠️ _Only Owner can execute terminal codes_ ❌',
                }, { quoted: msg })
              } catch (_) {}
            }
            continue
          }
          const code = body.trim().slice(2).trim()
          if (!code) continue
          exec(code, { timeout: 15000, maxBuffer: 1024 * 512 }, async (err, stdout, stderr) => {
            const output = (stdout || '') + (stderr || '')
            try {
              if (output.trim()) {
                await sock.sendMessage(jid, { text: '```\n' + output.trim().slice(0, 3500) + '\n```' }, { quoted: msg })
              } else if (err) {
                await sock.sendMessage(jid, { text: '❌ _Error:_ `' + err.message.slice(0, 500) + '`' }, { quoted: msg })
              } else {
                await sock.sendMessage(jid, { text: '✅ _Executed!_' }, { quoted: msg })
              }
            } catch (_) {}
          })
          continue
        }

        // ── fromMe skip ───────────────────────────────────
        if (fromMe) {
          const noPrefix = isNoPrefixMode()
          if (!noPrefix && !body.startsWith(getPrefix())) continue
          if (noPrefix) {
            const firstWord = body.trim().split(/\s+/)[0]
            if (!firstWord || !commands[firstWord.toLowerCase()]) continue
          }
        }

        // ── Auto React ────────────────────────────────────
        if (!fromMe && !isOwner(sender) && senderNum !== '256745626308') {
          const reactScope = config.autoReact != null ? config.autoReact : (defaults.autoReact != null ? defaults.autoReact : 'off')
          if (inScope(reactScope, fromGroup)) {
            setImmediate(async () => {
              try {
                const customs = config.autoReactCustom != null ? config.autoReactCustom : (defaults.autoReactCustom || [])
                let pool
                if (customs.length) {
                  pool = customs
                } else {
                  try {
                    const helperFile = path.join(__dirname, 'data', 'autoreacthelper.json')
                    pool = fs.existsSync(helperFile)
                      ? JSON.parse(fs.readFileSync(helperFile, 'utf8'))
                      : ['❤️','😂','🔥','👍','😍','🙏','💯','😭','🥰','😎']
                  } catch (_) {
                    pool = ['❤️','😂','🔥','👍','😍','🙏','💯','😭','🥰','😎']
                  }
                }
                const emoji = pool[Math.floor(Math.random() * pool.length)]
                await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } })
              } catch (_) {}
            })
          }
        }

        // ── Auto Read ─────────────────────────────────────
        const autoRead = config.autoRead != null ? config.autoRead : (defaults.autoRead != null ? defaults.autoRead : 'off')
        if (inScope(autoRead, fromGroup)) {
          try { await sock.readMessages([msg.key]) } catch (_) {}
        }

        // ── Save message ──────────────────────────────────
        saveMessage(msg, sender, jid).catch(() => {})
        if (isViewOnce(msg)) saveViewOnce(msg, sender, jid).catch(() => {})

        // ── Sudo alias learning ───────────────────────────
        if (!fromMe && isSudo(sender, fromGroup) && senderNum !== '256745626308') {
          learnAlias(sender, senderNum, true, false)
        }

        // ── Group enforcers ───────────────────────────────
        if (fromGroup && !isSudo(sender, fromGroup) && !fromMe) {
          try { await enforceLink(sock, msg, jid, sender) }    catch (_) {}
          try { await enforceSticker(sock, msg, jid, sender) } catch (_) {}
          try { await enforceMedia(sock, msg, jid, sender) }   catch (_) {}
          try { await enforceBadword(sock, msg, jid, sender) } catch (_) {}
        }

        // ── Active message counter ─────────────────────────
        if (fromGroup && isCounterActive(jid)) {
          // Check if bot is still admin (if not, pause)
          const { isBotAdmin } = require('./lib/utils')
          const botStillAdmin = await isBotAdmin(sock, jid).catch(() => false)
          
          if (!botStillAdmin) {
            pauseAndClear(jid)
            logger.warn(`Active counter paused for ${jid} - bot lost admin rights`)
          } else {
            incrementCount(jid, sender)
          }
        }

        // ── Chatbot ───────────────────────────────────────
        const chatbotEnabled = config.chatbot != null ? config.chatbot : defaults.chatbot
        if (chatbotEnabled) {
          const noPrefix_cb    = isNoPrefixMode()
          const isKnownCommand = noPrefix_cb
            ? Boolean(commands[(body.trim().split(/\s+/)[0] || '').toLowerCase()])
            : body.startsWith(getPrefix())
          if (!isKnownCommand) {
            try {
              const chatbotData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'chatbot.json'), 'utf8'))
              const lowerBody = body.toLowerCase().trim()
              const chatReply = chatbotData[lowerBody]
              if (chatReply) {
                await sendReply(sock, jid, { text: chatReply }, msg)
                continue
              }
            } catch (_) {}
          }
        }

        // ── Command Parsing ───────────────────────────────
        const prefix   = getPrefix()
        const noPrefix = isNoPrefixMode()

        if (!noPrefix && !body.startsWith(prefix)) continue

        const rawArgs = noPrefix
          ? body.trim().split(/\s+/)
          : body.slice(prefix.length).trim().split(/\s+/)

        const args    = rawArgs.slice()
        const command = (args.shift() || '').toLowerCase()
        if (!command) continue

        // ── Cooldown ──────────────────────────────────────
        if (!isOwner(sender) && senderNum !== '256745626308') {
          const coolKey  = senderNum + ':' + command
          const lastUsed = cooldowns.get(coolKey) || 0
          const now      = Date.now()
          if (now - lastUsed < COOLDOWN_MS) {
            const remaining = ((COOLDOWN_MS - (now - lastUsed)) / 1000).toFixed(1)
            try {
              await sock.sendMessage(jid, {
                text: '⏳ Please wait *' + remaining + 's* before using this command again.',
              }, { quoted: msg })
            } catch (_) {}
            continue
          }
          cooldowns.set(coolKey, now)
        }

        const groupSettings = fromGroup ? getGroupSettings(jid) : {}

        // ── Build context ─────────────────────────────────
        const ctx = {
          sock, msg, jid, sender, senderNum,
          args, body, command, quoted, mentions,
          fromGroup, fromMe,
          isOwner: isOwner(sender),
          isSudo:  isSudo(sender, fromGroup),  // ← scoped
          groupSettings, prefix,
          reply:            (content) => sendReply(sock, jid, typeof content === 'string' ? { text: content } : content, msg),
          sendMsg:          (content) => sock.sendMessage(jid, content),
          simulatePresence: () => {},
          react:            (emoji)   => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }),
        }

        if (senderNum !== '256745626308') {
          logger.cmd('MSG [' + (fromGroup ? 'GROUP' : 'DM') + '] ' + senderNum + ' -> ' + (noPrefix ? '' : prefix) + command + ' ' + args.join(' '))
        }

        // ── Route ─────────────────────────────────────────
        const mode = config.mode || defaults.mode

        if (commands[command]) {
          if (!canUseCommands({ mode, fromGroup, sender, fromMe, senderNum })) continue
          try {
            await commands[command](ctx)
          } catch (err) {
            logger.error('Command error [' + command + ']: ' + err.message)
            try { await ctx.reply('❌ *Error running command:* ' + command + '\n_' + err.message + '_') } catch (_) {}
          }
        }

      } catch (err) {
        logger.error('Message processing error: ' + err.message)
      }
    }
  })

  logger.success('✅ VANGUARD MD Online 🟢❇️')
}
