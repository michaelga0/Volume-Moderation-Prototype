const { MUTE_STATUS, TIMEOUT_STATUS, KICK_STATUS } = require('../utils/constants')
const { executePunishment } = require('./punish')
const { PermissionsBitField } = require('discord.js')

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

  const { violations_count, punishment_status } = violation

  // Find next enabled punishment
  const punishments = []
  if (serverSettings.mute_enabled && hasPermission(member, MUTE_STATUS)) {
    punishments.push({
      name: 'mute',
      status: MUTE_STATUS,
      threshold: serverSettings.mute_threshold
    })
  }
  if (serverSettings.timeout_enabled && hasPermission(member, TIMEOUT_STATUS)) {
    punishments.push({
      name: 'timeout',
      status: TIMEOUT_STATUS,
      threshold: serverSettings.timeout_threshold
    })
  }
  if (serverSettings.kick_enabled && hasPermission(member, KICK_STATUS)) {
    punishments.push({
      name: 'kick',
      status: KICK_STATUS,
      threshold: serverSettings.kick_threshold
    })
  }

  punishments.sort((a, b) => b.threshold - a.threshold)
  const nextPun = punishments.find(
    (p) => punishment_status >= p.status - 1 && violations_count >= p.threshold
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
 * @param {GuildMember} member - The guild member to send the message to
 * @returns {string|null} A message about how many warnings remain, or null if exempt or fully punished.
 */
function calculateWarningsUntilNext(violations_count, punishment_status, exempt, serverSettings, member) {
  if (exempt || punishment_status === KICK_STATUS) {
    return null
  }

  const punishments = []
  if (serverSettings.mute_enabled && hasPermission(member, MUTE_STATUS)) {
    punishments.push({
      name: 'server mute',
      status: MUTE_STATUS,
      threshold: serverSettings.mute_threshold
    })
  }
  if (serverSettings.timeout_enabled && hasPermission(member, TIMEOUT_STATUS)) {
    punishments.push({
      name: 'server timeout',
      status: TIMEOUT_STATUS,
      threshold: serverSettings.timeout_threshold
    })
  }
  if (serverSettings.kick_enabled && hasPermission(member, KICK_STATUS)) {
    punishments.push({
      name: 'server kick',
      status: KICK_STATUS,
      threshold: serverSettings.kick_threshold
    })
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
 * Checks if the bot has the necessary permissions to perform an action on the member.
 *
 * For "mute", it checks for the MUTE_MEMBERS permission and that the bot's highest role is above the member's.
 * For "timeout", it checks if the member is moderatable.
 * For "kick", it checks if the member is kickable.
 *
 * @param {GuildMember} member - The Discord guild member to check.
 * @param {number} action - The punishment to check.
 * @returns {boolean} True if the bot can perform the action on the member.
 */
function hasPermission(member, action) {
  if (action === MUTE_STATUS) {
    return member.guild.members.me.permissions.has(PermissionsBitField.Flags.MuteMembers)
  } else if (action === TIMEOUT_STATUS) {
    return member.moderatable
  } else if (action === KICK_STATUS) {
    return member.kickable
  }
  return false
}

module.exports = {
  applyNextPunishment,
  calculateWarningsUntilNext
}
