// ============================================================
//  VANGUARD MD — commands/apk.js
//  Android APK Downloader (Integrated)
// ============================================================

const axios = require('axios');

const pkg = require('api-qasim'); 

module.exports = async (ctx) => {
  const { sock, jid, msg, args, prefix, command, reply } = ctx;
  const query = args.join(' ').trim();

  if (!query) {
    return reply(
      `╭───────────────━⊷\n` +
      `┃ 📱 *VANGUARD APK DL*\n` +
      `╰───────────────━⊷\n` +
      `*Usage:* \`${prefix}${command} <app_name>\`\n` +
      `*Example:* \`${prefix}${command} Telegram\`\n` +
      `╰───────────────━⊷`
    );
  }

  await reply('🔎 *Scanning servers for APK files...*');

  try {
    // 1. Search for the APK
    const res = await pkg.apksearch(query);

    if (!res?.data || res.data.length === 0) {
      return reply('❌ *Error:* No APKs found for that query.');
    }

    const results = res.data;
    const firstMatch = results[0];

    // 2. Format the Search Menu
    let caption = `╭───────────────━⊷\n`;
    caption += `┃ 📱 *APK SEARCH RESULTS*\n`;
    caption += `╰───────────────━⊷\n`;
    caption += `┃ 🎯 *Query:* ${query}\n`;
    caption += `┃ 💡 *Action:* Reply with a number (1-${results.length})\n`;
    caption += `╰───────────────━⊷\n\n`;

    results.forEach((item, i) => {
      caption += `*${i + 1}.* ${item.judul}\n`;
      caption += `└ 👨‍💻 *Dev:* ${item.dev} | ⭐ ${item.rating}\n\n`;
    });

    caption += `> _VANGUARD MD Archive_`;

    // 3. Send Menu with Thumbnail
    const sentMsg = await sock.sendMessage(jid, { 
      image: { url: firstMatch.thumb }, 
      caption 
    }, { quoted: msg });

    // 4. Setup Interactive Listener (Timeout: 5 Mins)
    const timeout = setTimeout(async () => {
      sock.ev.off('messages.upsert', listener);
    }, 5 * 60 * 1000);

    const listener = async ({ messages }) => {
      const m = messages[0];
      if (!m?.message || m.key.remoteJid !== jid) return;

      const context = m.message?.extendedTextMessage?.contextInfo;
      if (!context?.stanzaId || context.stanzaId !== sentMsg.key.id) return;

      const replyText = m.message.conversation || m.message.extendedTextMessage?.text || '';
      const choice = parseInt(replyText.trim());

      if (isNaN(choice) || choice < 1 || choice > results.length) return;

      // Clean up listener once choice is made
      clearTimeout(timeout);
      sock.ev.off('messages.upsert', listener);

      const selected = results[choice - 1];
      await reply(`⬇️ *Downloading:* ${selected.judul}\n*Status:* Please wait...`);

      // 5. Fetch Download Link
      try {
        const dlApi = `https://discardapi.dpdns.org/api/apk/dl/android1?apikey=guru&url=${encodeURIComponent(selected.link)}`;
        const dlRes = await axios.get(dlApi);
        const apk = dlRes.data?.result;

        if (!apk?.url) throw new Error('Download link expired or invalid.');

        const safeName = apk.name.replace(/[^\w.-]/g, '_');

        // 6. Send APK as Document
        const apkCaption = 
          `╭───────────────━⊷\n` +
          `┃ 📦 *APK DOWNLOAD READY*\n` +
          `╰───────────────━⊷\n` +
          `┃ 📛 *Name:* ${apk.name}\n` +
          `┃ ⚖️ *Size:* ${apk.size}\n` +
          `┃ 📱 *Req:* ${apk.requirement}\n` +
          `╰───────────────━⊷\n` +
          `> _VANGUARD MD Reality_`;

        await sock.sendMessage(jid, { 
          document: { url: apk.url }, 
          fileName: `${safeName}.apk`, 
          mimetype: 'application/vnd.android.package-archive', 
          caption: apkCaption 
        }, { quoted: m });

      } catch (err) {
        await reply(`❌ *Download Failed:* ${err.message}`);
      }
    };

    sock.ev.on('messages.upsert', listener);

  } catch (err) {
    console.error('APK Plugin Error:', err);
    await reply('❌ *System Error:* Failed to process APK request.');
  }
};
