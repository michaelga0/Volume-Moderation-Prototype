const { writeLog } = require('../utils/logger')
const { Violation, ServerSettings } = require('../database/init-db')
const { applyNextPunishment, calculateWarningsUntilNext } = require('./moderation')
const { KICK_STATUS } = require('../utils/constants')
const { sendDM } = require('../utils/direct-message')

module.exports = {
  name: 'thresholdExceeded',
  /**
 * @param {GuildMember} member - The Discord guild member to check.
   * @param {number} rms - The root mean squared value threshold that has been exceeded.
   * @param {string} guildId - The Discord guild to check
   */
  async execute({ member, rms, guildId }) {
    try {
      let violation = await Violation.findOne({
        where: { user_id: member.id, guild_id: guildId }
      })
      if (!violation) {
        violation = await Violation.create({
          user_id: member.id,
          guild_id: guildId,
          violations_count: 0,
          punishment_status: 0,
          exempt: false
        })
      }

      const serverSettings = await ServerSettings.findOne({ where: { guild_id: guildId } })

      let resetDays = 1
      let resetHours = 0
      let resetMinutes = 0
      let resetEnabled = true

      if (serverSettings) {
        resetDays = serverSettings.violation_reset_days
        resetHours = serverSettings.violation_reset_hours
        resetMinutes = serverSettings.violation_reset_minutes
        resetEnabled = serverSettings.violation_reset_enabled
      }

      const violationResetTimeMs =
        (resetDays * 24 * 60 * 60 * 1000) +
        (resetHours * 60 * 60 * 1000) +
        (resetMinutes * 60 * 1000)

      if (resetEnabled) {
        if (Date.now() - violation.last_violation_at.getTime() > violationResetTimeMs) {
          violation.violations_count = 0
          violation.punishment_status = 0
        }
      }

      violation.violations_count += 1
      violation.last_violation_at = new Date()
      await violation.save()

      await applyNextPunishment(member, violation, serverSettings)

      // Re-fetch to get updated punishmentStatus if it changed
      await violation.reload()

      try {
        await member.guild.members.fetch({ user: member.id, force: true })
      } catch (error) {
        if (error.code === 10007) return
        throw error
      }

      let dmMessage = 'You\'re too loud. Please lower your volume.'
      const warningsLeftMsg = calculateWarningsUntilNext(
        violation.violations_count,
        violation.punishment_status,
        violation.exempt,
        serverSettings,
        member
      )
      if (warningsLeftMsg) {
        dmMessage += `\n${warningsLeftMsg}`
      }

      await sendDM(member, dmMessage)

      writeLog(
        `Warned ${member.user.tag} (RMS: ${rms}) in guild ${guildId}. ` +
        `Violations: ${violation.violations_count}, PunishmentStatus: ${violation.punishment_status}`
      )
    } catch (error) {
      writeLog(`Failed to process threshold exceed for ${member.user.tag}: ${error}`)
    }
  }
}
