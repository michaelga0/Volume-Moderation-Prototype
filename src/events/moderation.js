const { MUTE_STATUS, TIMEOUT_STATUS, KICK_STATUS } = require('../utils/constants')
const { executePunishment } = require('./punishment')

/**
 * Applies exactly one new punishment threshold if the user hasn't already reached it.
 * It sends a DM to the user informing them of the impending punishment (or fallback) before acting.
 * 
 * @param {GuildMember} member - The Discord guild member to punish.
 * @param {Violation} violation - The violation record.
 * @param {ServerSettings} serverSettings - The row from server_settings with threshold & enabled flags.
 * @returns {Promise<void>} Resolves once the appropriate punishment is applied (or fallback attempted).
 */
async function applyNextPunishment(member, violation, serverSettings) {
  if (violation.exempt) {
    return
  }

  if (violation.punishment_status === KICK_STATUS) {
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

  await executePunishment(member, violation, nextPun, serverSettings)
}

/**
 * Calculates how many warnings remain until the next punishment (if any).
 * If the user surpasses multiple thresholds, clamps the remainder to 1.
 * 
 * @param {number} violations_count - Number of violations so far.
 * @param {number} punishment_status - The user's current punishment status.
 * @param {boolean} exempt - If true, user is exempt from punishments.
 * @param {ServerSettings} serverSettings - The row from server_settings with threshold & enabled flags.
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

module.exports = {
  applyNextPunishment,
  calculateWarningsUntilNext
}
