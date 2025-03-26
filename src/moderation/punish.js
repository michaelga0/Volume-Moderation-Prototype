const { writeLog } = require('../utils/logger')
const { MUTE_STATUS, TIMEOUT_STATUS, KICK_STATUS } = require('../utils/constants')
const { sendDM } = require('../utils/direct-message')

/**
 * Executes a punishment for the given member based on the nextPun object.
 * If the punishment cannot be performed due to lack of permissions, attempts a fallback punishment.
 *
 * @param {GuildMember} member - The Discord guild member to punish.
 * @param {Violation} violation - The violation record.
 * @param {Object} nextPun - Contains { name, status, threshold }
 * @param {ServerSettings} serverSettings - The row from server_settings with threshold & enabled flags.
 * @returns {Promise<void>} - Resolves when a punishment is executed or there are no valid punishments.
 */
async function executePunishment(member, violation, nextPun, serverSettings) {
  try {
    if (nextPun.name === 'mute') {
      await sendDM(member, `You will be muted in the server "${member.guild.name}" for repeated volume violations.`)
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations')
      }
      violation.punishment_status = MUTE_STATUS

    } else if (nextPun.name === 'timeout') {
      await sendDM(
        member,
        `You will be timed out for ${serverSettings.timeout_duration} minute(s) in the server "${member.guild.name}" for repeated volume violations.`
      )
      await member.timeout(serverSettings.timeout_duration * 60000, 'Repeated volume violations')
      violation.punishment_status = TIMEOUT_STATUS

    } else if (nextPun.name === 'kick') {
      await sendDM(
        member,
        `You will be kicked from the server "${member.guild.name}" for repeated volume violations.`
      )
      await member.kick('Repeated volume violations')
      violation.punishment_status = KICK_STATUS
    }

    await violation.save()
    writeLog(`Successfully executed punishment ${nextPun.name} for ${member.user.tag}`)

  } catch (err) {
    writeLog(`Failed to ${nextPun.name} ${member.user.tag}: ${String(err)}`)
  }
}

module.exports = {
  executePunishment
}
