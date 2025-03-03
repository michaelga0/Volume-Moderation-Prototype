const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')
const { ServerSettings } = require('../database/init-db')
const { writeLog } = require('../utils/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toggleviolationreset')
    .setDescription('Enable or disable the violation counter reset timer for the server.')
    .addBooleanOption(option =>
      option
        .setName('enabled')
        .setDescription('True to enable violation resets, false to disable them.')
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

      serverSettings.violation_reset_enabled = enabled
      await serverSettings.save()

      await interaction.reply({
        content: `Violation reset has been **${enabled ? 'enabled' : 'disabled'}**.`,
        flags: MessageFlags.Ephemeral
      })

      writeLog(
        `Violation reset set to ${enabled} for guild ${guildId} by user ${interaction.user.tag}`
      )
    } catch (error) {
      writeLog(`Failed to toggle violation reset for guild ${guildId}: ${error}`)
      await interaction.reply({
        content: 'An error occurred while toggling violation reset. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
