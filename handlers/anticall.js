// ============================================================
//  VANGUARD MD – Anti-Call Handler 
//  Now receives logger from index.js to avoid circular deps
// ============================================================

const { getAntiCallConfig, formatMessage } = require('../lib/anticallhelper')

// Tiny deduplication set (prevents the event firing 2-3 times)
const handledCallIds = new Set()

module.exports = (sock, logger, config, defaults) => {
  
  sock.ev.on('call', async (calls) => {
    const ac = getAntiCallConfig()
    if (ac.mode === 'off') return

    for (const call of calls) {
      if (call.status !== 'offer') continue
      if (handledCallIds.has(call.id)) continue
      handledCallIds.add(call.id)

      const callerLid = call.from
      const callType = call.isVideo === true ? 'video' : 'voice'
      const meName = sock.user?.name || 'VANGUARD MD'
      const ownerNum = config.ownerNumber || defaults.ownerNumber || ''
      const ownerJid = ownerNum ? `${ownerNum}@s.whatsapp.net` : null

      // Helper to get real phone JID for messaging/blocking (LID-safe)
      const getBestJid = (lid) => {
        try {
          const realJid = sock.signalRepository?.lidMapping?.getPNForLID?.(lid.replace('@lid', ''))
          if (realJid) return realJid.endsWith('@s.whatsapp.net') ? realJid : `${realJid}@s.whatsapp.net`
        } catch (_) {}
        return lid
      }

      const bestJid = getBestJid(callerLid)

      try {
        // ALWAYS reject FIRST using the ORIGINAL LID
        await sock.rejectCall(call.id, callerLid)
        logger.info(`📵 Rejected ${callType} call from ${callerLid.split('@')[0]}`)

        await new Promise(resolve => setTimeout(resolve, 400))

        if (ac.mode === 'decline') continue

        // Prepare mentions array (both caller and owner)
        const mentions = [bestJid]
        if (ownerJid) mentions.push(ownerJid)

        if (ac.mode === 'block') {
          try {
            await sock.updateBlockStatus(bestJid, 'block')

            // Block notification to caller (tags both)
            await sock.sendMessage(bestJid, {
              text: `🚫 *CALL BLOCKED*\n\nHey @${bestJid.split('@')[0]}, your ${callType} call was declined and you've been blocked.\nContact @${ownerNum} if this is a mistake.`,
              mentions: mentions
            })

            // Notification to owner (tags both)
            if (ac.notifyOwner && ownerJid) {
              await sock.sendMessage(ownerJid, {
                text: `🚫 *Anti-Call Block*\n\nBlocked: @${bestJid.split('@')[0]}\nType: ${callType} call\nTime: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`,
                mentions: mentions
              })
            }

            logger.success(`🚫 Blocked ${bestJid.split('@')[0]}`)
          } catch (blockErr) {
            logger.error(`Block failed: ${blockErr.message}`)
            
            // Fallback message with mentions
            const fallbackMsg = ac.useCustomMessage && ac.customMessageTemplate
              ? formatMessage(ac.customMessageTemplate, {
                  caller: `@${bestJid.split('@')[0]}`,
                  owner: ownerNum ? `@${ownerNum}` : '@owner',
                  me: meName,
                  calltype: callType,
                  time: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: true })
                })
              : ac.message

            await sock.sendMessage(bestJid, { 
              text: fallbackMsg,
              mentions: mentions
            })
          }
          continue
        }

        // Default msg mode with mentions support
        const messageText = ac.useCustomMessage && ac.customMessageTemplate
          ? formatMessage(ac.customMessageTemplate, {
              caller: `@${bestJid.split('@')[0]}`,
              owner: ownerNum ? `@${ownerNum}` : '@owner',
              me: meName,
              calltype: callType,
              time: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour12: true })
            })
          : `📵 *Call Rejected*\n\nHey @${bestJid.split('@')[0]}, ${meName} is currently not accepting ${callType} calls.\nContact @${ownerNum} for emergencies.`

        await sock.sendMessage(bestJid, { 
          text: messageText,
          mentions: mentions
        })
        
        logger.info(`📵 Sent rejection message to ${bestJid.split('@')[0]} with mentions`)

      } catch (err) {
        logger.error(`❌ Anti-call error for ${callerLid}: ${err.message}`)
      }
    }
  })
}
