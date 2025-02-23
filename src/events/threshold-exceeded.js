const { writeLog } = require('../utils/logger')
const { Violation } = require('../database/init-db')

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
      let violation = await Violation.findOne({ userId: member.id, guildId })
      if (!violation) {
        violation = new Violation({
          userId: member.id,
          guildId,
          violationsCount: 0
        })
      }
      violation.violationsCount += 1
      violation.lastViolationAt = new Date()
      await violation.save()
      await member.send("You're too loud. Please lower your volume.")
      writeLog(
        `Warned ${member.user.tag} for exceeding volume threshold (RMS: ${rms}) in guild ${guildId}. ` +
        `Total Violations: ${violation.violationsCount}`
      )
    } catch (error) {
      writeLog(`Failed to process threshold exceed for ${member.user.tag}: ${error}`)
    }
  }
}
