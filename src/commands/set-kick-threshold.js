const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')
const { ServerSettings } = require('../database/init-db')
const { validate, failValidation } = require('../database/punishment-validator')
const { writeLog } = require('../utils/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setkickthreshold')
    .setDescription('Set the kick threshold for this server.')
    .addIntegerOption(option =>
      option
        .setName('threshold')
        .setDescription('Kick threshold (must be an integer).')
        .setRequired(false)
    )
    // Requires Manage Guild permission for the user invoking the command.
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const guildId = interaction.guildId
    const newThreshold = interaction.options.getInteger('threshold')

    try {
      let serverSettings = await ServerSettings.findOne({ where: { guild_id: guildId } })
      if (!serverSettings) {
        serverSettings = await ServerSettings.create({ guild_id: guildId })
      }

      if (!serverSettings.kick_enabled) {
        await interaction.reply({
          content: 'Kick is not enabled. Enable it before using this command.',
          flags: MessageFlags.Ephemeral
        })
        return
      }

      const violationOccurred = await validate(serverSettings)
      if (violationOccurred) {
        writeLog(`Validation failed for guild ${guildId}, thresholds reset to defaults. Command aborted.`)
        await interaction.reply({
          content: 'We encountered an error. Server settings have been reset to default. Please try again.',
          flags: MessageFlags.Ephemeral
        })
        return
      }

      // If no new threshold was provided, show current threshold and usage
      if (newThreshold === null) {
        await interaction.reply({
          content: `Current kick threshold: **${serverSettings.kick_threshold}**\nUsage: /setkickthreshold threshold:<integer>`,
          flags: MessageFlags.Ephemeral
        })
        return
      }

      if (serverSettings.mute_enabled) {
        if (serverSettings.mute_threshold >= newThreshold) {
          return failValidation(interaction, guildId)
        }
      }
      if (serverSettings.timeout_enabled) {
        if (serverSettings.timeout_threshold >= newThreshold) {
          return failValidation(interaction, guildId)
        }
      }

      serverSettings.kick_threshold = newThreshold
      await serverSettings.save()

      await interaction.reply({
        content: `Kick threshold set to **${newThreshold}**.`,
        flags: MessageFlags.Ephemeral
      })
      writeLog(`Kick threshold set to ${newThreshold} for guild ${guildId} by ${interaction.user.tag}`)

    } catch (error) {
      writeLog(`Failed to set kick threshold for guild ${guildId}: ${error}`)
      await interaction.reply({
        content: 'An error occurred while setting the kick threshold. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
