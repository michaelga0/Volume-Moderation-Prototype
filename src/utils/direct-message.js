const { writeLog } = require('./logger')

/**
 * Attempts to send a DM to the given member and logs an error if it fails.
 * 
 * @param {GuildMember} member - The Discord guild member to send a DM to.
 * @param {string} content - The message content to send.
 * @returns {Promise<void>}
 */
async function sendDM(member, content) {
  try {
    await member.send(content)
  } catch (err) {
    writeLog(`Failed to send DM to ${member.user.tag}: ${String(err)}`)
  }
}

module.exports = { sendDM }