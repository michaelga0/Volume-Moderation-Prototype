const { writeLog } = require('../utils/logger')

const MUTE_THRESHOLD = 5
const DISCONNECT_THRESHOLD = 7
const KICK_THRESHOLD = 9

/**
 * Applies exactly one new punishment threshold if the user hasn't already reached it.
 * If a punishment fails with error code 50013 (Missing Permissions),
 * it attempts to fall back to a lesser punishment without checking the current punishmentStatus.
 * 
 * @param {GuildMember} member - The Discord guild member to punish.
 * @param {Object} violation - The violation record.
 * @param {number} violation.violationsCount - How many times the user has violated the threshold.
 * @param {number} violation.punishmentStatus - Current punishment level (0=none, 1=muted, 2=disconnected, 3=kicked).
 * @param {boolean} violation.exempt - If true, user is exempt from punishments but still accumulates violations.
 * @returns {Promise<void>} Resolves once the appropriate punishment is applied (or fails).
 */
async function applyNextPunishment(member, violation) {
  if (violation.exempt) {
    return
  }

  const { violationsCount, punishmentStatus } = violation

  // Attempt Mute
  if (punishmentStatus < 1 && violationsCount >= MUTE_THRESHOLD) {
    try {
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations')
      }
      violation.punishmentStatus = 1
      await violation.save()
      return
    } catch (err) {
      writeLog(`Failed to mute ${member.user.tag}: ${handleErrorMsg(err)}`)
      return
    }
  }

  // Attempt Disconnect
  if (punishmentStatus < 2 && violationsCount >= DISCONNECT_THRESHOLD) {
    try {
      if (member.voice.channel) {
        await member.voice.disconnect('Repeated volume violations')
      }
      violation.punishmentStatus = 2
      await violation.save()
      return
    } catch (err) {
      writeLog(`Failed to disconnect ${member.user.tag}: ${handleErrorMsg(err)}`)
      // If missing perms, fallback to Mute
      if (err.rawError?.code === 50013) {
        await fallbackMute(member, violation)
      }
      return
    }
  }

  // Attempt Kick
  if (punishmentStatus < 3 && violationsCount >= KICK_THRESHOLD) {
    try {
      await member.kick('Repeated volume violations')
      violation.punishmentStatus = 3
      await violation.save()
    } catch (err) {
      writeLog(`Failed to kick ${member.user.tag}: ${handleErrorMsg(err)}`)
      if (err.rawError?.code === 50013) {
        // Fallback to Disconnect, then Mute
        await fallbackDisconnect(member, violation)
        if (violation.punishmentStatus < 2) {
          // If still not disconnected, try mute
          await fallbackMute(member, violation)
        }
      }
    }
  }
}

/**
 * Calculates how many warnings remain until the next punishment (if any).
 * If the user surpasses multiple thresholds, clamps the remainder to 1.
 * 
 * @param {number} violationsCount - Number of violations so far.
 * @param {number} punishmentStatus - The user's current punishment status.
 * @param {boolean} exempt - If true, user is exempt from punishments.
 * @returns {string|null} A message about how many warnings remain, or null if exempt or fully punished.
 */
function calculateWarningsUntilNext(violationsCount, punishmentStatus, exempt) {
  if (exempt || punishmentStatus === 3) {
    return null
  }

  let nextThreshold = 0
  let punishmentLabel = ''

  if (punishmentStatus === 0) {
    nextThreshold = MUTE_THRESHOLD
    punishmentLabel = 'a server mute'
  } else if (punishmentStatus === 1) {
    nextThreshold = DISCONNECT_THRESHOLD
    punishmentLabel = 'a voice disconnect'
  } else if (punishmentStatus === 2) {
    nextThreshold = KICK_THRESHOLD
    punishmentLabel = 'a server kick'
  } else {
    return null
  }

  let warningsLeft = nextThreshold - violationsCount
  if (warningsLeft < 1) {
    warningsLeft = 1
  }
  return `You have ${warningsLeft} more warnings until ${punishmentLabel}.`
}

/**
 * Attempts to fallback-disconnect the user.
 * If successful, updates the punishmentStatus to 2.
 * 
 * @param {import('discord.js').GuildMember} member - The Discord guild member to disconnect.
 * @param {Object} violation - The violation record to update.
 * @returns {Promise<void>} Resolves once the fallback disconnect is attempted.
 */
async function fallbackDisconnect(member, violation) {
  try {
    if (member.voice.channel) {
      await member.voice.disconnect('Repeated volume violations (fallback)')
      violation.punishmentStatus = 2
      await violation.save()
    }
  } catch (err) {
    writeLog(`Failed fallback to disconnect ${member.user.tag}: ${handleErrorMsg(err)}`)
  }
}

/**
 * Attempts to fallback-mute the user.
 * If successful, updates the punishmentStatus to 1.
 * 
 * @param {import('discord.js').GuildMember} member - The Discord guild member to mute.
 * @param {Object} violation - The violation record to update.
 * @returns {Promise<void>} Resolves once the fallback mute is attempted.
 */
async function fallbackMute(member, violation) {
  try {
    if (member.voice.channel) {
      await member.voice.setMute(true, 'Repeated volume violations (fallback)')
      violation.punishmentStatus = 1
      await violation.save()
    }
  } catch (err) {
    writeLog(`Failed fallback to mute ${member.user.tag}: ${handleErrorMsg(err)}`)
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
