// ============================================================
//  VANGUARD MD — commands/getfile.js
//  Universal Recursive File Finder (Owner Only)
// ============================================================

const fs = require('fs').promises;
const path = require('path');

/**
 * Deep Scan Engine: Recursively searches for a filename
 * Skips node_modules and .git for maximum speed.
 */
async function findFileRecursively(dir, targetFile) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Ignore "black hole" directories to keep speed high
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'temp') continue;
      
      const found = await findFileRecursively(fullPath, targetFile);
      if (found) return found;
    } else if (entry.name.toLowerCase() === targetFile.toLowerCase()) {
      return fullPath;
    }
  }
  return null;
}

module.exports = async (ctx) => {
  const { sock, jid, msg, args, isOwner, reply, prefix, command } = ctx;

  if (!isOwner) return reply('❌ *Access Denied:* Internal Terminal Locked.');

  const target = args[0]?.trim();

  if (!target) {
    return reply(`*🔍 VANGUARD DEEP SCAN*\n\nUsage: \`${prefix}${command} <filename>\`\nExample: \`${prefix}${command} ping.js\``);
  }

  await reply(`⚡ *Scanning entire panel for:* \`${target}\`...`);

  try {
    // Start the recursive hunt from the root (process.cwd)
    const startTime = Date.now();
    const filePath = await findFileRecursively(process.cwd(), target);
    const endTime = Date.now();

    if (!filePath) {
      return reply(`❌ *Search Failed:* Could not find \`${target}\` anywhere on the panel.`);
    }

    // Read and Validate
    const stats = await fs.stat(filePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    if (stats.size > 65000) {
      return reply(`❌ *File Too Large:* \`${target}\` is ${fileSizeKB}KB. (Limit: 65KB for WhatsApp stability)`);
    }

    const content = await fs.readFile(filePath, 'utf8');
    const ext = path.extname(filePath).replace('.', '') || 'txt';
    const scanTime = (endTime - startTime) / 1000;

    // ── VANGUARD TERMINAL OUTPUT ─────────────────────────────
    const report = 
      `╭───────────────━⊷\n` +
      `┃ 🛰️ *VANGUARD DEEP SCAN COMPLETE*\n` +
      `╰───────────────━⊷\n` +
      `┃ 📍 *Path:* ${path.relative(process.cwd(), filePath)}\n` +
      `┃ ⚡ *Speed:* ${scanTime}s\n` +
      `┃ 📊 *Size:* ${fileSizeKB} KB\n` +
      `╰───────────────━⊷\n\n` +
      `\`\`\`${ext}\n${content}\`\`\`\n\n` +
      `> _Search Depth: Full Panel_`;

    await reply(report);

  } catch (error) {
    console.error('DeepScan Error:', error);
    await reply(`❌ *Terminal Error:* ${error.message}`);
  }
};
