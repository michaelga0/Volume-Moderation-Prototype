const { writeLog } = require('../utils/logger')

const MUTE_STATUS = 1
const TIMEOUT_STATUS = 2
const KICK_STATUS = 3

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

/**
 * Applies exactly one new punishment threshold if the user hasn't already reached it.
 * Before executing the punishment, it checks whether the bot has permission to perform the action.
 * It sends a DM to the user informing them of the impending punishment (or fallback) before acting.
 * 
 * @param {GuildMember} member - The Discord guild member to punish.
 * @param {Object} violation - The violation record.
 * @param {Object} serverSettings - The row from server_settings with threshold & enabled flags.
 * @returns {Promise<void>} Resolves once the appropriate punishment is applied (or fallback attempted).
 */
async function applyNextPunishment(member, violation, serverSettings) {
  if (violation.exempt) {
    return
  }

  if (violation.punishment_status === KICK_STATUS){
    violation.punishment_status = TIMEOUT_STATUS
  }

  const { violations_count, punishment_status } = violation

  // Find next enabled punishment
  const punishments = []
  if (serverSettings.mute_enabled) {
    punishments.push({
      name: 'mute',
      status: MUTE_STATUS,
      threshold: serverSettings.mute_threshold
    })
  }
  if (serverSettings.timeout_enabled) {
    punishments.push({
      name: 'timeout',
      status: TIMEOUT_STATUS,
      threshold: serverSettings.timeout_threshold
    })
  }
  if (serverSettings.kick_enabled) {
    punishments.push({
      name: 'kick',
      status: KICK_STATUS,
      threshold: serverSettings.kick_threshold
    })
  }

  punishments.sort((a, b) => a.threshold - b.threshold)
  const nextPun = punishments.find(
    (p) => punishment_status < p.status && violations_count >= p.threshold
  )
  if (!nextPun) {
    return
  }

  try {
    if (nextPun.name === 'mute') {
      if (!hasPermission(member, 'mute')) {
        await fallbackToLesserPunishment(member, violation, MUTE_STATUS, serverSettings)
        return
      }
      await member.send(`You will be muted in the server "${member.guild.name}" for repeated volume violations.`)
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations')
      }
      violation.punishment_status = MUTE_STATUS
    } else if (nextPun.name === 'timeout') {
      if (!hasPermission(member, 'timeout')) {
        await fallbackToLesserPunishment(member, violation, TIMEOUT_STATUS, serverSettings)
        return
      }
      await member.send(`You will be timed out for ${serverSettings.timeout_duration} minute(s) in the server "${member.guild.name}" for repeated volume violations.`)
      await member.timeout(serverSettings.timeout_duration * 60000, 'Repeated volume violations')
      violation.punishment_status = TIMEOUT_STATUS
    } else if (nextPun.name === 'kick') {
      if (!hasPermission(member, 'kick')) {
        await fallbackToLesserPunishment(member, violation, KICK_STATUS, serverSettings)
        return
      }
      // For kick, send DM before kicking
      await member.send(`You will be kicked from the server "${member.guild.name}" for repeated volume violations.`)
      await member.kick('Repeated volume violations')
      violation.punishment_status = KICK_STATUS
    }
    await violation.save()
  } catch (err) {
    writeLog(`Failed to ${nextPun.name} ${member.user.tag}: ${handleErrorMsg(err)}`)
  }
}

/**
 * Fallback logic if the intended punishment cannot be performed due to insufficient permissions.
 * It checks for available lower-level punishments and sends a DM before attempting them.
 * 
 * @param {GuildMember} member - The user to punish.
 * @param {Object} violation - Violation record from DB.
 * @param {number} failedStatus - The numeric status that just failed.
 * @param {Object} serverSettings - The row from server_settings with threshold & enabled flags.
 * @returns {Promise<void>} - Resolves once a fallback punishment is applied or none are available.
 */
async function fallbackToLesserPunishment(member, violation, failedStatus, serverSettings) {
  if (failedStatus === KICK_STATUS) {
    // Fallback from kick to timeout, then to mute.
    if (hasPermission(member, 'timeout')) {
      await member.send(`You will be timed out for ${serverSettings.timeout_duration} minute(s) in the server "${member.guild.name}" as a fallback for repeated volume violations.`)
      await member.timeout(serverSettings.timeout_duration * 60000, 'Repeated volume violations (fallback)')
      violation.punishment_status = TIMEOUT_STATUS
      await violation.save()
    } else if (hasPermission(member, 'mute')) {
      await member.send(`You will be muted in the server "${member.guild.name}" as a fallback for repeated volume violations.`)
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations (fallback)')
      }
      violation.punishment_status = MUTE_STATUS
      await violation.save()
    }
  } else if (failedStatus === TIMEOUT_STATUS || failedStatus === MUTE_STATUS) {
    // Fallback from timeout to mute.
    if (hasPermission(member, 'mute')) {
      await member.send(`You will be muted in the server "${member.guild.name}" as a fallback for repeated volume violations.`)
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations (fallback)')
      }
      violation.punishment_status = MUTE_STATUS
      await violation.save()
    }
  }
}

/**
 * Helper to produce a short error message if err.rawError?.code === 50013, or log the entire error otherwise.
 * 
 * @param {Error & { rawError?: { code?: number } }} err - The error caught during a punishment operation.
 * @returns {string} A short or full string describing the error.
 */
function handleErrorMsg(err) {
  if (err.rawError?.code === 50013) {
    return 'Missing permissions.'
  }
  return String(err)
}

module.exports = {
  applyNextPunishment,
  calculateWarningsUntilNext
}

/**
 * Calculates how many warnings remain until the next punishment (if any).
 * If the user surpasses multiple thresholds, clamps the remainder to 1.
 * 
 * @param {number} violations_count - Number of violations so far.
 * @param {number} punishment_status - The user's current punishment status.
 * @param {boolean} exempt - If true, user is exempt from punishments.
 * @param {Object} serverSettings - The row from server_settings with threshold & enabled flags.
 * @returns {string|null} A message about how many warnings remain, or null if exempt or fully punished.
 */
function calculateWarningsUntilNext(violations_count, punishment_status, exempt, serverSettings) {
  if (exempt || punishment_status === KICK_STATUS) {
    return null
  }

  const punishments = []
  if (serverSettings.mute_enabled) {
    punishments.push({ name: 'server mute', status: MUTE_STATUS, threshold: serverSettings.mute_threshold })
  }
  if (serverSettings.timeout_enabled) {
    punishments.push({ name: 'server timeout', status: TIMEOUT_STATUS, threshold: serverSettings.timeout_threshold })
  }
  if (serverSettings.kick_enabled) {
    punishments.push({ name: 'server kick', status: KICK_STATUS, threshold: serverSettings.kick_threshold })
  }
  punishments.sort((a, b) => a.threshold - b.threshold)

  const nextPun = punishments.find((p) => p.status > punishment_status)
  if (!nextPun) {
    return null
  }

  let warningsLeft = nextPun.threshold - violations_count
  if (warningsLeft < 1) {
    warningsLeft = 1
  }
  return `You have ${warningsLeft} more warnings until a ${nextPun.name}.`
}
