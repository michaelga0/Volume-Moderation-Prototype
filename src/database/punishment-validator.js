const { MessageFlags } = require('discord.js')
const { writeLog } = require('../utils/logger')
const {
  DEFAULT_MUTE_THRESHOLD,
  DEFAULT_TIMEOUT_THRESHOLD,
  DEFAULT_KICK_THRESHOLD
} = require('../utils/constants')

/**
 * Validates the punishment thresholds in a ServerSettings object.
 * Enforces: mute threshold < timeout threshold < kick threshold for enabled punishments.
 * If any condition is violated, resets all thresholds to their default values and saves.
 *
 * @param {ServerSettings} serverSettings - The row from server_settings with threshold & enabled flags.
 * @returns {Promise<boolean>} True if a violation was found and defaults were applied, false otherwise.
 */
async function validate(serverSettings) {
  let violationFound = false

  if (serverSettings.mute_enabled && serverSettings.timeout_enabled) {
    if (serverSettings.mute_threshold >= serverSettings.timeout_threshold) {
      violationFound = true
    }
  }

  if (serverSettings.mute_enabled && serverSettings.kick_enabled) {
    if (serverSettings.mute_threshold >= serverSettings.kick_threshold) {
      violationFound = true
    }
  }

  if (serverSettings.timeout_enabled && serverSettings.kick_enabled) {
    if (serverSettings.timeout_threshold >= serverSettings.kick_threshold) {
      violationFound = true
    }
  }

  if (violationFound) {
    serverSettings.mute_threshold = DEFAULT_MUTE_THRESHOLD
    serverSettings.timeout_threshold = DEFAULT_TIMEOUT_THRESHOLD
    serverSettings.kick_threshold = DEFAULT_KICK_THRESHOLD
    await serverSettings.save()
  }

  return violationFound
}

function failValidation(interaction, guildId) {
  writeLog(`Threshold validation failed for guild ${guildId}. No changes made.`)
  return interaction.reply({
    content:
      'Failed to set threshold. The following conditions must all hold for enabled punishments:\n' +
      '1) If both MUTE and TIMEOUT are enabled, then MUTE_THRESHOLD < TIMEOUT_THRESHOLD.\n' +
      '2) If both MUTE and KICK are enabled, then MUTE_THRESHOLD < KICK_THRESHOLD.\n' +
      '3) If both TIMEOUT and KICK are enabled, then TIMEOUT_THRESHOLD < KICK_THRESHOLD.',
    flags: MessageFlags.Ephemeral
  })
}

module.exports = { validate, failValidation }
