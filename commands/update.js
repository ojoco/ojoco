// ============================================================
//  VANGUARD MD — commands/update.js
//    single message, heavy edits  (FIXED)
// ============================================================
module.exports = async (ctx) => {
  const { sock, msg, jid, reply, isSudo } = ctx
  
  if (!isSudo) return reply('❌ Command Reserved For Owner And Sudos only!')
  
  const bar = (pct) => `[${'█'.repeat(pct / 10)}${'░'.repeat(10 - pct / 10)}] ${pct}%`
  
  // ✅ FIX: Use sock.sendMessage to get message key (reply() returns undefined)
  const m = await sock.sendMessage(jid, {
    text: '╭───────────────━⊷\n' +
          '┃ ✳️ System Update Started 👩‍💻🧑‍💻\n' +
          '╰───────────────━⊷\n' +
          '╭───────────────━⊷\n' +
          `┃ *⌛️Progress:* ${bar(20)}\n` +
          '╰───────────────━⊷'
  }, { quoted: msg })
  
  // 40%
  await new Promise(r => setTimeout(r, 1200))
  await sock.sendMessage(jid, {
    text: '╭───────────────━⊷\n' +
          '┃ ✳️ System Update Started 👩‍💻🧑‍💻\n' +
          '╰───────────────━⊷\n' +
          '╭───────────────━⊷\n' +
          `┃ *⌛️Progress:* ${bar(40)}\n` +
          '╰───────────────━⊷',
    edit: m.key
  })
  
  // 60%
  await new Promise(r => setTimeout(r, 1200))
  await sock.sendMessage(jid, {
    text: '╭───────────────━⊷\n' +
          '┃ ✳️ System Update Started 👩‍💻🧑‍💻\n' +
          '╰───────────────━⊷\n' +
          '╭───────────────━⊷\n' +
          `┃ *⌛️Progress:* ${bar(60)}\n` +
          '╰───────────────━⊷',
    edit: m.key
  })
  
  // 80%
  await new Promise(r => setTimeout(r, 1200))
  await sock.sendMessage(jid, {
    text: '╭───────────────━⊷\n' +
          '┃ ✳️ System Update Started 👩‍💻🧑‍💻\n' +
          '╰───────────────━⊷\n' +
          '╭───────────────━⊷\n' +
          `┃ *⌛️Progress:* ${bar(80)}\n` +
          '╰───────────────━⊷',
    edit: m.key
  })
  
  // 100% ✅ SUCCESS — final edit
  await new Promise(r => setTimeout(r, 1200))
  await sock.sendMessage(jid, {
    text: '╭───────────────━⊷\n' +
          '┃ ✅ Success\n' +
          '╰───────────────━⊷\n' +
          '╭───────────────━⊷\n' +
          `┃ *⌛️Progress:* ${bar(100)}\n` +
          '╰───────────────━⊷',
    edit: m.key
  })
  
  // NEW message (not edit) — warnings
  await reply('💾 Initiate a manual Restart/Start on Your Host If Lags Occur 📡')
  
  // EXIT — ghost dances on restart
  setTimeout(() => process.exit(0), 500)
}
