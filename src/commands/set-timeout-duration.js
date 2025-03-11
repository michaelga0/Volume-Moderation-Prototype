const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')
const { ServerSettings } = require('../database/init-db')
const { writeLog } = require('../utils/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settimeoutduration')
    .setDescription('Set the timeout duration (in minutes) for this server. Must be at least 1.')
    .addIntegerOption(option =>
      option
        .setName('minutes')
        .setDescription('The timeout duration in minutes.')
        .setRequired(false)
    )
  // Requires Manage Guild permission for the user invoking the command.
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const guildId = interaction.guildId
    const newDuration = interaction.options.getInteger('minutes')

    try {
      let serverSettings = await ServerSettings.findOne({ where: { guild_id: guildId } })
      if (!serverSettings) {
        serverSettings = await ServerSettings.create({ guild_id: guildId })
      }

      // If no argument was provided, show current duration and usage
      if (newDuration === null) {
        await interaction.reply({
          content: `Current timeout duration: **${serverSettings.timeout_duration} minute(s)**\n`+
          'Usage: /set-timeout-duration minutes:<integer> (must be >= 1)',
          flags: MessageFlags.Ephemeral
        })
        return
      }

      if (newDuration < 1) {
        await interaction.reply({
          content: 'The timeout duration must be at least 1 minute.',
          flags: MessageFlags.Ephemeral
        })
        return
      }

      serverSettings.timeout_duration = newDuration
      await serverSettings.save()

      await interaction.reply({
        content: `Timeout duration set to **${newDuration} minute(s)**.`,
        flags: MessageFlags.Ephemeral
      })

      writeLog(`Timeout duration set to ${newDuration} for guild ${guildId} by ${interaction.user.tag}`)
    } catch (error) {
      writeLog(`Failed to set timeout duration for guild ${guildId}: ${error}`)
      await interaction.reply({
        content: 'An error occurred while setting the timeout duration. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
