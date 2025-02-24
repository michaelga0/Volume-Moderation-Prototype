const { writeLog } = require('../utils/logger')
const { Violation } = require('../database/init-db')
const { applyNextPunishment, calculateWarningsUntilNext } = require('./moderation')

const VIOLATION_RESET_DAYS = 1
const VIOLATION_RESET_HOURS = 0
const VIOLATION_RESET_MINUTES = 0

// Convert our constants into milliseconds
const VIOLATION_RESET_TIME_MS =
  (VIOLATION_RESET_DAYS * 24 * 60 * 60 * 1000) +
  (VIOLATION_RESET_HOURS * 60 * 60 * 1000) +
  (VIOLATION_RESET_MINUTES * 60 * 1000)

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
      let violation = await Violation.findOne({
        where: { userId: member.id, guildId }
      })
      if (!violation) {
        violation = await Violation.create({
          userId: member.id,
          guildId,
          violationsCount: 0,
          punishmentStatus: 0,
          exempt: false
        })
      }

      // Reset violationsCount if last violation is more than VIOLATION_RESET_TIME_MS ago
      if (Date.now() - violation.lastViolationAt.getTime() > VIOLATION_RESET_TIME_MS) {
        violation.violationsCount = 0
        violation.punishmentStatus = 0
      }

      violation.violationsCount += 1
      violation.lastViolationAt = new Date()
      await violation.save()

      await applyNextPunishment(member, violation)

      // Re-fetch to get updated punishmentStatus if it changed
      await violation.reload()

      let dmMessage = 'You\'re too loud. Please lower your volume.'
      const warningsLeftMsg = calculateWarningsUntilNext(
        violation.violationsCount,
        violation.punishmentStatus,
        violation.exempt
      )
      if (warningsLeftMsg) {
        dmMessage += `\n${warningsLeftMsg}`
      }

      await member.send(dmMessage)

      writeLog(
        `Warned ${member.user.tag} (RMS: ${rms}) in guild ${guildId}. ` +
        `Violations: ${violation.violationsCount}, PunishmentStatus: ${violation.punishmentStatus}`
      )
    } catch (error) {
      writeLog(`Failed to process threshold exceed for ${member.user.tag}: ${error}`)
    }
  }
}
