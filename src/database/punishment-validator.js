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
  
  module.exports = { validate }
  