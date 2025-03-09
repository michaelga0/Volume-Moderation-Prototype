const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')
const { ServerSettings } = require('../database/init-db')
const { validate } = require('../database/punishment-validator')
const { writeLog } = require('../utils/logger')
const {
  DEFAULT_MUTE_THRESHOLD,
  DEFAULT_TIMEOUT_THRESHOLD,
  DEFAULT_KICK_THRESHOLD
} = require('../utils/constants')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('togglemute')
    .setDescription('Enable or disable the mute punishment for this server.')
    .addBooleanOption(option =>
      option
        .setName('enabled')
        .setDescription('True to enable mute, false to disable.')
        .setRequired(true)
    )
  // Requires Manage Guild permission for the user invoking the command.
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
  async execute(interaction) {
    const guildId = interaction.guildId
    const enabled = interaction.options.getBoolean('enabled')

    try {
      let serverSettings = await ServerSettings.findOne({ where: { guild_id: guildId } })
      if (!serverSettings) {
        serverSettings = await ServerSettings.create({ guild_id: guildId })
      }

      serverSettings.mute_enabled = enabled
      await serverSettings.save()

      if (enabled) {
        const violationOccurred = await validate(serverSettings)
        if (violationOccurred) {
          writeLog(`Validation failed for guild ${guildId} upon enabling mute, thresholds reset to defaults.`)
          await interaction.reply({
            content:
              'Thresholds have been reset to default:\n' +
              `Mute: ${DEFAULT_MUTE_THRESHOLD}, Timeout: ${DEFAULT_TIMEOUT_THRESHOLD}, Kick: ${DEFAULT_KICK_THRESHOLD}\n` +
              'Mute is now enabled.',
            flags: MessageFlags.Ephemeral
          })
          return
        }
        await interaction.reply({
          content: 'Mute has been **enabled**.',
          flags: MessageFlags.Ephemeral
        })
      } else {
        await interaction.reply({
          content: 'Mute has been **disabled**.',
          flags: MessageFlags.Ephemeral
        })
      }

      writeLog(`Mute toggled to ${enabled} for guild ${guildId} by ${interaction.user.tag}`)
    } catch (error) {
      writeLog(`Failed to toggle mute for guild ${guildId}: ${error}`)
      await interaction.reply({
        content: 'An error occurred while toggling the mute setting. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
