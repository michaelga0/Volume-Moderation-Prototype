const { writeLog } = require('../utils/logger')

const MUTE_STATUS = 1
const TIMEOUT_STATUS = 2
const KICK_STATUS = 3

/**
 * Applies exactly one new punishment threshold if the user hasn't already reached it.
 * If a punishment fails with error code 50013 (Missing Permissions),
 * it attempts to fall back to a lesser punishment without checking the current punishment_status.
 * 
 * @param {GuildMember} member - The Discord guild member to punish.
 * @param {Object} violation - The violation record.
 * @param {Object} serverSettings - The row from server_settings with threshold & enabled flags.
 * @returns {Promise<void>} Resolves once the appropriate punishment is applied (or fails).
 */
async function applyNextPunishment(member, violation, serverSettings) {
  if (violation.exempt) {
    return
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
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations')
      }
      violation.punishment_status = MUTE_STATUS
    } else if (nextPun.name === 'timeout') {
      await member.timeout(60000, 'Repeated volume violations')
      violation.punishment_status = TIMEOUT_STATUS
    } else if (nextPun.name === 'kick') {
      await member.kick('Repeated volume violations')
      violation.punishment_status = KICK_STATUS
    }
    await violation.save()
  } catch (err) {
    writeLog(`Failed to ${nextPun.name} ${member.user.tag}: ${handleErrorMsg(err)}`)
    if (err.rawError?.code === 50013) {
      await fallbackToLesserPunishment(member, violation, nextPun.status)
    }
  }
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

/**
 * Fallback logic if we fail to apply a higher punishment due to missing permissions.
 * We'll try successively lower punishments.
 * 
 * @param {GuildMember} member - The user to punish.
 * @param {Object} violation - Violation record from DB.
 * @param {number} failedStatus - The numeric status that just failed
 * @returns {Promise<void>} - Resolves once punishment is successful or all valid punishments are attempted
 */
async function fallbackToLesserPunishment(member, violation, failedStatus) {
  if (failedStatus === KICK_STATUS) {
    try {
      await member.timeout(600000, 'Repeated volume violations (fallback)')
      violation.punishment_status = TIMEOUT_STATUS
      await violation.save()
    } catch (timeoutErr) {
      writeLog(`Failed fallback to timeout ${member.user.tag}: ${handleErrorMsg(timeoutErr)}`)
      if (timeoutErr.rawError?.code === 50013) {
        try {
          if (member.voice.channel) {
            await member.voice.setMute(true, 'Repeated volume violations (fallback)')
          }
          violation.punishment_status = MUTE_STATUS
          await violation.save()
        } catch (muteErr) {
          writeLog(`Failed fallback to mute ${member.user.tag}: ${handleErrorMsg(muteErr)}`)
        }
      }
    }
  } else if (failedStatus === TIMEOUT_STATUS) {
    try {
      if (member.voice.channel) {
        await member.voice.setMute(true, 'Repeated volume violations (fallback)')
      }
      violation.punishment_status = MUTE_STATUS
      await violation.save()
    } catch (muteErr) {
      writeLog(`Failed fallback to mute ${member.user.tag}: ${handleErrorMsg(muteErr)}`)
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
