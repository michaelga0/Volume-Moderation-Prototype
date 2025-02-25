const { writeLog } = require('../utils/logger')
const { MUTE_STATUS, TIMEOUT_STATUS, KICK_STATUS } = require('../utils/constants')
const { sendDM } = require('../utils/direct-message')

/**
 * Fallback logic if the intended punishment cannot be performed due to insufficient permissions.
 * It checks for available lower-level punishments and sends a DM before attempting them.
 * 
 * @param {GuildMember} member - The user to punish.
 * @param {Violation} violation - Violation record from DB.
 * @param {number} failedStatus - The numeric status that just failed.
 * @param {ServerSettings} serverSettings - The row from server_settings with threshold & enabled flags.
 * @returns {Promise<void>} - Resolves once a fallback punishment is applied or none are available.
 */
async function fallbackToLesserPunishment(member, violation, failedStatus, serverSettings) {
  if (failedStatus === KICK_STATUS) {
    // Fallback from kick to timeout, then to mute.
    if (hasPermission(member, 'timeout')) {
      await sendDM(
        member,
        `You will be timed out for ${serverSettings.timeout_duration} minute(s) in the server "${member.guild.name}" as a fallback for repeated volume violations.`
      )
      await member.timeout(serverSettings.timeout_duration * 60000, 'Repeated volume violations (fallback)')
      violation.punishment_status = TIMEOUT_STATUS
      await violation.save()
      writeLog(`Successfully applied fallback punishment (timeout) to ${member.user.tag}`)
    } else if (hasPermission(member, 'mute')) {
      await sendDM(
        member,
        `You will be muted in the server "${member.guild.name}" as a fallback for repeated volume violations.`
      )
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations (fallback)')
      }
      violation.punishment_status = MUTE_STATUS
      await violation.save()
      writeLog(`Successfully applied fallback punishment (mute) to ${member.user.tag}`)
    } else {
      writeLog(`Insufficient permission to punish ${member.user.tag}`)
    }
  } else if (failedStatus === TIMEOUT_STATUS || failedStatus === MUTE_STATUS) {
    // Fallback from timeout to mute.
    if (hasPermission(member, 'mute')) {
      await sendDM(
        member,
        `You will be muted in the server "${member.guild.name}" as a fallback for repeated volume violations.`
      )
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations (fallback)')
      }
      violation.punishment_status = MUTE_STATUS
      await violation.save()
      writeLog(`Successfully applied fallback punishment (mute) to ${member.user.tag}`)
    } else {
      writeLog(`Insufficient permission to punish ${member.user.tag}`)
    }
  }
}

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
      if (!hasPermission(member, 'mute')) {
        await fallbackToLesserPunishment(member, violation, MUTE_STATUS, serverSettings)
        return
      }
      await sendDM(member, `You will be muted in the server "${member.guild.name}" for repeated volume violations.`)
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations')
      }
      violation.punishment_status = MUTE_STATUS

    } else if (nextPun.name === 'timeout') {
      if (!hasPermission(member, 'timeout')) {
        await fallbackToLesserPunishment(member, violation, TIMEOUT_STATUS, serverSettings)
        return
      }
      await sendDM(
        member,
        `You will be timed out for ${serverSettings.timeout_duration} minute(s) in the server "${member.guild.name}" for repeated volume violations.`
      )
      await member.timeout(serverSettings.timeout_duration * 60000, 'Repeated volume violations')
      violation.punishment_status = TIMEOUT_STATUS

    } else if (nextPun.name === 'kick') {
      if (!hasPermission(member, 'kick')) {
        await fallbackToLesserPunishment(member, violation, KICK_STATUS, serverSettings)
        return
      }
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

/**
 * Checks if the bot has the necessary permissions to perform an action on the member.
 *
 * For "mute", it checks for the MUTE_MEMBERS permission and that the bot's highest role is above the member's.
 * For "timeout", it checks if the member is moderatable.
 * For "kick", it checks if the member is kickable.
 *
 * @param {GuildMember} member - The Discord guild member to check.
 * @param {string} action - The action to check ("mute", "timeout", or "kick").
 * @returns {boolean} True if the bot can perform the action on the member.
 */
function hasPermission(member, action) {
  if (action === 'mute') {
    return member.guild.members.me.permissions.has('MUTE_MEMBERS')
  } else if (action === 'timeout') {
    return member.moderatable
  } else if (action === 'kick') {
    return member.kickable
  }
  return false
}

module.exports = {
  executePunishment
}
