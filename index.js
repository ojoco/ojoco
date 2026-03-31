// ============================================================
//  VANGUARD MD — index.js
//  Auto-install guard + Startup | Pairing | Loader
// ============================================================

// ── Auto-install guard — runs BEFORE any require ─────────────
;(() => {
  const { execSync } = require('child_process')
  const _fs   = require('fs')
  const _path = require('path')
  const _baileys = _path.join(__dirname, 'node_modules', '@whiskeysockets', 'baileys')

  if (!_fs.existsSync(_baileys)) {
    console.log('\x1b[36m[VANGUARD MD]\x1b[0m Dependencies not found. Installing...')
    console.log('\x1b[33mThis may take 1-2 minutes on first run...\x1b[0m')
    try {
      execSync('npm install --legacy-peer-deps', { stdio: 'inherit', cwd: __dirname })
      console.log('\x1b[32m[✅ DONE]\x1b[0m All dependencies installed! Starting bot...\n')
    } catch (err) {
      console.error('\x1b[31m[❌ ERROR]\x1b[0m npm install failed: ' + err.message)
      process.exit(1)
    }
  } else {
    console.log('\x1b[32m[✅ READY]\x1b[0m Dependencies found. Starting bot...\n')
  }
})()

// ── Core requires ─────────────────────────────────────────────
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay,
} = require('@whiskeysockets/baileys')

const NodeCache  = require('node-cache')
const readline   = require('readline')
const pino       = require('pino')
const path       = require('path')
const fs         = require('fs')
const chalk      = require('chalk')
const config     = require('./config')
const defaults   = require('./defaults')
const logger     = require('./lib/logger')
const { startCleanupScheduler } = require('./lib/messageStore')

const STARTUP_IMAGE  = path.join(__dirname, 'assets','backup', 'botimage.jpg')
const DEV_NUM        = '+256745626308'
const BOT_CHANNEL    = 'https://whatsapp.com/channel/0029Vb6RoNb0bIdgZPwcst2Y'
const BOT_GROUP      = 'https://chat.whatsapp.com/IsVD8tBoIsH4es4nq8moNv?mode=hq2tcli'
const GROUP_INVITE   = 'IsVD8tBoIsH4es4nq8moNv'

// ── Always use pairing code mode ──────────────────────────────
const pairingCode = true

// ── Auto-load all command plugins ─────────────────────────────
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))

const commands = {}
for (const file of commandFiles) {
  try {
    const plugin = require(path.join(commandsPath, file))
    const name   = path.basename(file, '.js')
    commands[name] = plugin
    logger.info('✅ Loaded command: ' + name)
  } catch (err) {
    logger.error('❌ Failed to load command: ' + file + ' — ' + err.message)
  }
}

// ── Readline for pairing ──────────────────────────────────────
const rl = process.stdin.isTTY
  ? readline.createInterface({ input: process.stdin, output: process.stdout })
  : null

const question = (text) => {
  if (rl) return new Promise(resolve => rl.question(text, resolve))
  return Promise.resolve(config.ownerNumber || defaults.ownerNumber || '')
}

// ── Session directory ─────────────────────────────────────────
const SESSION_DIR = path.join(__dirname, 'session')
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true })

const CONFIG_FILE = path.join(__dirname, 'data', 'config.json')

// ── Session intelligence ──────────────────────────────────────
const hasExistingSession = () => {
  try {
    const files = fs.readdirSync(SESSION_DIR)
    if (!files.includes('creds.json')) return false
    const activityFiles = files.filter(f =>
      f.startsWith('app-state-sync-key-')     ||
      f.startsWith('app-state-sync-version-') ||
      f.startsWith('sender-key-')             ||
      f.startsWith('session-')                ||
      f.startsWith('pre-key-')
    )
    const isGenuine = activityFiles.length >= 2
    if (!isGenuine) logger.warn('⚠️  creds.json found but session activity files missing — treating as fresh install')
    return isGenuine
  } catch { return false }
}

const hasExistingConfig = () => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return false
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    return Object.keys(saved).length > 0
  } catch { return false }
}

// ── Wipe session folder ───────────────────────────────────────
const wipeSession = () => {
  try {
    fs.rmSync(SESSION_DIR, { recursive: true, force: true })
    fs.mkdirSync(SESSION_DIR, { recursive: true })
    logger.warn('🗑️ Session wiped — restart to re-authenticate')
  } catch (_) {}
}

// ── Startup image ─────────────────────────────────────────────
const getStartupImage = () => {
  try {
    if (fs.existsSync(STARTUP_IMAGE)) return fs.readFileSync(STARTUP_IMAGE)
  } catch (_) {}
  return null
}

// ── Border builder ────────────────────────────────────────────
const border = (title, lines) => {
  const botName = config.botName || defaults.botName || 'VANGUARD MD'
  return (
    '╭───────────────━⊷\n' +
    '┃ *🤖 ' + botName + ' 🤖*\n' +
    '╰───────────────━⊷\n' +
    '╭───────────────━⊷\n' +
    (title ? '┃ *' + title + '*\n' : '') +
    lines.map(l => '┃ ' + l).join('\n') + '\n' +
    '╰───────────────━⊷\n' +
    '> *_Made With Love By Admin Blue_*'
  )
}

// ── Build startup messages ────────────────────────────────────
const buildStartupMessage = (isReturning) => {
  const prefix   = config.prefix      || defaults.prefix      || '.'
  const mode     = config.mode        || defaults.mode        || 'public'
  const owner    = config.ownerNumber || defaults.ownerNumber || 'Not set'
  const cmdCount = Object.keys(commands).length
  const time     = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: true })

  if (isReturning) {
    return border('✅ BOT ONLINE — RESUMING SESSION', [
      '👑 *Owner:* +' + owner,
      '🔑 *Prefix:* ' + prefix,
      '📡 *Mode:* ' + mode.toUpperCase(),
      '⚡ *Commands:* ' + cmdCount + ' loaded',
      '👁️ *Auto View Status:* ' + ((config.autoViewStatus ?? defaults.autoViewStatus) ? 'ON' : 'OFF'),
      '🗑️ *Anti Delete:* '      + ((config.antidelete      ?? defaults.antidelete)      ? 'ON' : 'OFF'),
      '✏️ *Anti Edit:* '         + ((config.antiedit         ?? defaults.antiedit)         ? 'ON' : 'OFF'),
      '📵 *Anti Call:* '         + ((config.anticall         ?? defaults.anticall)         ? 'ON' : 'OFF'),
      '🤖 *Chatbot:* '           + ((config.chatbot          ?? defaults.chatbot)          ? 'ON' : 'OFF'),
      '🕐 *Time:* ' + time,
      '🛠️ *Dev:* ' + DEV_NUM,
    ])
  } else {
    return border('🎉 FRESH INSTALL — WELCOME!', [
      '👑 *Owner:* +' + owner,
      '🔑 *Prefix:* ' + prefix,
      '📡 *Mode:* ' + mode.toUpperCase(),
      '⚡ *Commands:* ' + cmdCount + ' loaded',
      '🕐 *Time:* ' + time,
      '🛠️ *Dev:* ' + DEV_NUM,
      '',
      '💡 *Quick Setup Tips:*',
      prefix + 'setprefix — change prefix',
      prefix + 'public / ' + prefix + 'private — change mode',
      prefix + 'anticall on/off — toggle call block',
      prefix + 'autoviewstatus on/off — view statuses',
      prefix + 'antidelete on/off — deleted msg alerts',
      prefix + 'chatbot on/off — toggle chatbot',
    ])
  }
}

// ── Auto join channel + group — once per install ──────────────
const autoJoinCommunity = async (sock) => {
  const FLAG_FILE = path.join(__dirname, 'data', '.joined')

  if (fs.existsSync(FLAG_FILE)) {
    logger.info('🔗 Community join already done — skipping')
    return
  }

  await delay(8000)

  let channelOk = false
  let groupOk   = false

  try {
    const info = await sock.getNewsletterInfo(BOT_CHANNEL)
    if (info?.id) {
      await sock.newsletterFollow(info.id)
      logger.success('📢 Joined VANGUARD MD channel ✅')
      channelOk = true
    } else {
      logger.warn('📢 Channel info returned no ID — skipping')
      channelOk = true
    }
  } catch (err) {
    if (
      err.message?.includes('already')    ||
      err.message?.includes('duplicate')  ||
      err.message?.includes('subscribed')
    ) {
      logger.info('📢 Channel already followed ✅')
      channelOk = true
    } else {
      logger.warn('📢 Channel join skipped: ' + err.message)
      channelOk = true
    }
  }

  await delay(3000)

  try {
    await sock.groupAcceptInvite(GROUP_INVITE)
    logger.success('👥 Joined VANGUARD MD group ✅')
    groupOk = true
  } catch (err) {
    if (
      err.message?.includes('already')     ||
      err.message?.includes('duplicate')   ||
      err.message?.includes('participant')
    ) {
      logger.info('👥 Already in VANGUARD MD group ✅')
      groupOk = true
    } else {
      logger.warn('👥 Group join skipped: ' + err.message)
      groupOk = true
    }
  }

  if (channelOk && groupOk) {
    try {
      fs.mkdirSync(path.dirname(FLAG_FILE), { recursive: true })
      fs.writeFileSync(FLAG_FILE, new Date().toISOString())
    } catch (_) {}
  }

  try {
    await delay(2000)
    const ownerJid = (config.ownerNumber || defaults.ownerNumber) + '@s.whatsapp.net'
    await sock.sendMessage(ownerJid, {
      text:
        '╭───────────────━⊷\n' +
        '┃ 🔗 *VANGUARD MD COMMUNITY*\n' +
        '╰───────────────━⊷\n' +
        '╭───────────────━⊷\n' +
        '┃ 📢 *Updates Channel:*\n' +
        '┃ ' + BOT_CHANNEL + '\n' +
        '┃\n' +
        '┃ 👥 *Support Group:*\n' +
        '┃ ' + BOT_GROUP + '\n' +
        '┃\n' +
        '┃ _Join for updates, tips & support!_\n' +
        '╰───────────────━⊷\n' +
        '> *_Made With Love By Admin Blue_*'
    })
  } catch (_) {}
}

// ── Track if pairing code already requested ───────────────────
let pairingRequested = false

// ── Main connection function ──────────────────────────────────
async function startVanguard() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
    const { version }          = await fetchLatestBaileysVersion()
    const msgRetryCounterCache = new NodeCache()

    const isReturning = hasExistingSession() && hasExistingConfig()

    if (isReturning) {
      logger.success('🔄 Genuine session detected — resuming quietly...')
    } else {
      logger.info('🚀 Fresh start — VANGUARD MD v' + version.join('.'))
    }

    // ── Ask number BEFORE socket ──────────────────────────
    let phone = ''
    if (pairingCode && !state.creds.registered) {
      console.log('\n' + chalk.bgCyan.black(' 📱 PAIRING REQUIRED ') + '\n')
      console.log(chalk.white('Enter your WhatsApp number with country code.'))
      console.log(chalk.gray('Example: 256745626308  (no + or spaces)\n'))
      phone = await question(chalk.green('➤ Your number: '))
      phone = phone.replace(/[^0-9]/g, '').trim()
      if (!phone || phone.length < 7) {
        logger.error('❌ Invalid phone number. Exiting.')
        process.exit(1)
      }
      console.log('\n' + chalk.green('✅ Number accepted: +' + phone))
      console.log(chalk.yellow('⏳ Starting socket, pairing code will appear shortly...\n'))
    }

    // ── CREATE SOCKET ─────────────────────────────────────
    const sock = makeWASocket({
      version,
      logger:              pino({ level: 'silent' }),
      printQRInTerminal:   !pairingCode,
      browser:             ['Ubuntu', 'Chrome', '20.0.04'],
      auth: {
        creds: state.creds,
        keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
      },
      markOnlineOnConnect:            config.alwaysOnline || defaults.alwaysOnline,
      generateHighQualityLinkPreview: true,
      syncFullHistory:                false,
      getMessage:                     async () => ({ conversation: '' }),
      msgRetryCounterCache,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs:      60000,
      keepAliveIntervalMs:   10000,
    })

    // ── ATTACH ALL LISTENERS ──────────────────────────────
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('creds.update', async () => {
      if (!config.ownerNumber && sock.authState?.creds?.me?.id) {
        const ownerNumber = sock.authState.creds.me.id.split(':')[0].split('@')[0]
        config.ownerNumber = ownerNumber
        logger.info('👑 Owner number saved: +' + ownerNumber)
      }
    })

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      // ── Request pairing code — only on connecting, after socket warms ──
      if (
        connection === 'connecting' &&
        pairingCode &&
        !state.creds.registered &&
        phone &&
        !pairingRequested
      ) {
        pairingRequested = true
        await delay(5000)
        try {
          let code = await sock.requestPairingCode(phone)
          code = code?.match(/.{1,4}/g)?.join('-') || code
          console.log('\n' + chalk.bgGreen.black(' 🔑 PAIRING CODE ') + ' ' + chalk.green.bold(code) + '\n')
          console.log(chalk.yellow('👉 WhatsApp > Linked Devices > Link with phone number > Enter code above\n'))
        } catch (err) {
          logger.error('❌ Failed to get pairing code: ' + err.message)
          pairingRequested = false
        }
      }

      if (connection === 'connecting') {
        logger.info('🔄 Connecting...')
      }

      if (connection === 'open') {
        if (rl) rl.close()
        pairingRequested = false
        logger.success('✅ VANGUARD MD Connected Successfully!')
        logger.info('👑 Owner   : ' + (config.ownerNumber || defaults.ownerNumber))
        logger.info('🤖 Bot     : ' + (sock.user?.name || config.botName || 'VANGUARD MD'))
        logger.info('📡 Mode    : ' + (config.mode || defaults.mode))
        logger.info('🔑 Prefix  : ' + (config.prefix || defaults.prefix))
        logger.info('⚡ Commands: ' + Object.keys(commands).length + ' loaded')
        logger.info('🔁 Session : ' + (isReturning ? 'Returning ✅' : 'Fresh install 🎉'))

        await delay(1999)

        // ── Send startup message ──────────────────────────
        try {
          const ownerJid = (config.ownerNumber || defaults.ownerNumber) + '@s.whatsapp.net'
          const image    = getStartupImage()
          if (image) {
            await sock.sendMessage(ownerJid, {
              image:   image,
              caption: buildStartupMessage(isReturning),
            })
          } else {
            await sock.sendMessage(ownerJid, {
              text: buildStartupMessage(isReturning),
            })
          }
        } catch (err) {
          logger.error('❌ Startup message failed: ' + err.message)
        }

        // ── Cleanup scheduler ─────────────────────────────
        startCleanupScheduler()

        // ── Auto Bio — resume if was ON ───────────────────
        try {
          const { startAutoBio } = require('./commands/autobio')
          if (config.autoBio ?? defaults.autoBio ?? false) {
            startAutoBio(sock)
            logger.info('📝 AutoBio resumed')
          }
        } catch (_) {}

        // ── Auto join community — non-blocking ────────────
        autoJoinCommunity(sock).catch(() => {})

        // ── Load main handler ─────────────────────────────
        const main = require('./main')
        main(sock, commands)
      }

      if (connection === 'close') {
        const statusCode      = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        logger.warn('⚠️  Connection closed. Reason: ' + statusCode)

        // ── Only wipe on TRUE permanent logout, never on temp 401 ──
        if (statusCode === DisconnectReason.loggedOut) {
          wipeSession()
          logger.error('🚫 Logged out. Restart the bot to re-authenticate.')
          process.exit(1)
        }

        if (shouldReconnect) {
          logger.info('♻️  Reconnecting in 5 seconds...')
          pairingRequested = false
          await delay(5000)
          startVanguard()
        }
      }
    })

    // ── Anti-Call ─────────────────────────────────────────
    // ════════════════════════════════════════════════════════════
//  ANTI-CALL — Bulletproof Version (Handles All Edge Cases)
// ════════════════════════════════════════════════════════════

// Track handled calls to prevent duplicates
const handledCalls = new Set();

// Clean up every hour to prevent memory leak
setInterval(() => handledCalls.clear(), 3600000);

sock.ev.on('call', async (calls) => {
  // Get config fresh each time
  const { getAntiCallConfig, formatMessage } = require('./lib/anticallhelper');
  const ac = getAntiCallConfig();
  
  // Only skip if explicitly off
  if (ac.mode === 'off') return;

  for (const call of calls) {
    // ── Deduplication: Skip if we've seen this call ─────────
    const callKey = `${call.from}:${call.id}`;
    if (handledCalls.has(callKey)) continue;
    handledCalls.add(callKey);

    // ── Only handle 'offer' status (incoming call) ───────────
    if (call.status !== 'offer') continue;

    // ── Extract caller JID (handles both phone and LID formats) ─
    const callerJid = call.from;
    const callType = call.isVideo === true ? 'video' : 'voice';
    const meName = sock.user?.name || 'VANGUARD MD';
    const ownerJid = (config.ownerNumber || defaults.ownerNumber) + '@s.whatsapp.net';

    try {
      // ── ALWAYS reject the call first (all modes except off) ─
      await sock.rejectCall(call.id, callerJid);
      logger.info(`📵 Rejected ${callType} call from ${callerJid.split('@')[0]}`);

      // ── Mode: decline (just end, nothing else) ─────────────
      if (ac.mode === 'decline') {
        continue; // Done
      }

      // ── Mode: block (end + block + notify) ──────────────────
      if (ac.mode === 'block') {
        try {
          // Block the caller
          await sock.updateBlockStatus(callerJid, 'block');
          
          // Notify caller they're blocked
          await sock.sendMessage(callerJid, {
            text: `🚫 *CALL BLOCKED*\n\n` +
                  `Your ${callType} call was declined and you've been blocked.\n` +
                  `_Contact owner if this is a mistake._`
          });

          // Notify owner
          if (ac.notifyOwner && ownerJid) {
            await sock.sendMessage(ownerJid, {
              text: `🚫 *Anti-Call Block*\n\n` +
                    `Blocked: @${callerJid.split('@')[0]}\n` +
                    `Type: ${callType} call\n` +
                    `Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`,
              mentions: [callerJid]
            });
          }

          logger.success(`🚫 Blocked ${callerJid.split('@')[0]}`);
        } catch (blockErr) {
          logger.error(`Block failed: ${blockErr.message}`);
          // Fallback: send normal message
          const fallbackMsg = ac.useCustomMessage && ac.customMessageTemplate
            ? formatMessage(ac.customMessageTemplate, {
                caller: callerJid.split('@')[0],
                me: meName,
                calltype: callType,
                time: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: true })
              })
            : ac.message;
          await sock.sendMessage(callerJid, { text: fallbackMsg });
        }
        continue;
      }

      // ── Mode: msg (end + send message) ───────────────────────
      // Build message (custom or default)
      let message;
      if (ac.useCustomMessage && ac.customMessageTemplate) {
        message = formatMessage(ac.customMessageTemplate, {
          caller: callerJid.split('@')[0],
          me: meName,
          calltype: callType,
          time: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: true })
        });
      } else {
        message = ac.message;
      }

      await sock.sendMessage(callerJid, { text: message });
      logger.info(`📵 Sent message to ${callerJid.split('@')[0]}`);

    } catch (err) {
      logger.error(`❌ Anti-call error: ${err.message}`);
    }
  }
});


    return sock

  } catch (err) {
    logger.error('💥 startVanguard error: ' + err.message)
    await delay(5000)
    startVanguard()
  }
}

// ── Graceful Error Handling ───────────────────────────────────
process.on('uncaughtException',  (err)    => { logger.error('💥 Uncaught Exception: '  + err.message); console.error(err) })
process.on('unhandledRejection', (reason) => { logger.error('💥 Unhandled Rejection: ' + reason) })

// ── Launch ────────────────────────────────────────────────────
startVanguard()