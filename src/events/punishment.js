const { writeLog } = require('../utils/logger')
const { MUTE_STATUS, TIMEOUT_STATUS, KICK_STATUS } = require('../utils/constants')

/**
 * Fallback logic if the intended punishment cannot be performed due to insufficient permissions.
 * It checks for available lower-level punishments and sends a DM before attempting them.
 * 
 * @param {GuildMember} member - The user to punish.
 * @param {Object} violation - Violation record from DB.
 * @param {number} failedStatus - The numeric status that just failed.
 * @param {Object} serverSettings - The row from server_settings with threshold & enabled flags.
 * @param {Function} hasPermission - The permission checking function (from moderation.js).
 * @returns {Promise<void>} - Resolves once a fallback punishment is applied or none are available.
 */
async function fallbackToLesserPunishment(member, violation, failedStatus, serverSettings, hasPermission) {
  if (failedStatus === KICK_STATUS) {
    // Fallback from kick to timeout, then to mute.
    if (hasPermission(member, 'timeout')) {
      await member.send(
        `You will be timed out for ${serverSettings.timeout_duration} minute(s) in the server "${member.guild.name}" as a fallback for repeated volume violations.`
      )
      await member.timeout(serverSettings.timeout_duration * 60000, 'Repeated volume violations (fallback)')
      violation.punishment_status = TIMEOUT_STATUS
      await violation.save()
      writeLog(`Successfully applied fallback punishment (timeout) to ${member.user.tag}`)
    } else if (hasPermission(member, 'mute')) {
      await member.send(
        `You will be muted in the server "${member.guild.name}" as a fallback for repeated volume violations.`
      )
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations (fallback)')
      }
      violation.punishment_status = MUTE_STATUS
      await violation.save()
      writeLog(`Successfully applied fallback punishment (mute) to ${member.user.tag}`)
    }
  } else if (failedStatus === TIMEOUT_STATUS || failedStatus === MUTE_STATUS) {
    // Fallback from timeout to mute.
    if (hasPermission(member, 'mute')) {
      await member.send(
        `You will be muted in the server "${member.guild.name}" as a fallback for repeated volume violations.`
      )
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations (fallback)')
      }
      violation.punishment_status = MUTE_STATUS
      await violation.save()
      writeLog(`Successfully applied fallback punishment (mute) to ${member.user.tag}`)
    }
  }
}

/**
 * Executes a punishment for the given member based on the nextPun object.
 * If the punishment cannot be performed due to lack of permissions, attempts a fallback punishment.
 *
 * @param {GuildMember} member
 * @param {Object} violation
 * @param {Object} nextPun - Contains { name, status, threshold }
 * @param {Object} serverSettings
 * @param {Function} hasPermission
 * @returns {Promise<void>}
 */
async function executePunishment(member, violation, nextPun, serverSettings, hasPermission) {
  try {
    if (nextPun.name === 'mute') {
      if (!hasPermission(member, 'mute')) {
        await fallbackToLesserPunishment(member, violation, MUTE_STATUS, serverSettings, hasPermission)
        return
      }
      await member.send(`You will be muted in the server "${member.guild.name}" for repeated volume violations.`)
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations')
      }
      violation.punishment_status = MUTE_STATUS

    } else if (nextPun.name === 'timeout') {
      if (!hasPermission(member, 'timeout')) {
        await fallbackToLesserPunishment(member, violation, TIMEOUT_STATUS, serverSettings, hasPermission)
        return
      }
      await member.send(
        `You will be timed out for ${serverSettings.timeout_duration} minute(s) in the server "${member.guild.name}" for repeated volume violations.`
      )
      await member.timeout(serverSettings.timeout_duration * 60000, 'Repeated volume violations')
      violation.punishment_status = TIMEOUT_STATUS

    } else if (nextPun.name === 'kick') {
      if (!hasPermission(member, 'kick')) {
        await fallbackToLesserPunishment(member, violation, KICK_STATUS, serverSettings, hasPermission)
        return
      }
      await member.send(`You will be kicked from the server "${member.guild.name}" for repeated volume violations.`)
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
  fallbackToLesserPunishment,
  executePunishment
}
