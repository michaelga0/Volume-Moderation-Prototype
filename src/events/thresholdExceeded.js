const { writeLog } = require('../utils/logger')

module.exports = {
  name: 'thresholdExceeded',
  /**
   * @param {Object} payload
   * @param {GuildMember} payload.member
   * @param {number} payload.rms
   * @param {string} payload.guildId
   */
  async execute({ member, rms, guildId }) {
    try {
      await member.send("You're too loud. Please lower your volume.")
      writeLog(`Warned ${member.user.tag} for exceeding volume threshold (RMS: ${rms}) in guild ${guildId}.`)
    } catch (error) {
      writeLog(`Failed to DM ${member.user.tag}: ${error}`)
    }
  }
}
