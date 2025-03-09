const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')
const { ServerSettings } = require('../database/init-db')
const { writeLog } = require('../utils/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setviolationreset')
    .setDescription('Set the number of days, hours, and/or minutes for violation resets.')
    .addIntegerOption(option =>
      option
        .setName('days')
        .setDescription('Number of days')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('hours')
        .setDescription('Number of hours')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('minutes')
        .setDescription('Number of minutes')
        .setRequired(false)
    )
  // Requires Manage Guild permission for the user invoking the command.
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const guildId = interaction.guildId

    let days = interaction.options.getInteger('days')
    let hours = interaction.options.getInteger('hours')
    let minutes = interaction.options.getInteger('minutes')      

    try {
      let serverSettings = await ServerSettings.findOne({ where: { guild_id: guildId } })
      if (!serverSettings) {
        serverSettings = await ServerSettings.create({ guild_id: guildId })
      }

      if (days === null && hours === null && minutes === null) {
        await interaction.reply({
          content: 
            'Current violation reset time is' +
            `${serverSettings.violation_reset_days} day(s),` +
            `${serverSettings.violation_reset_hours} hour(s), ${serverSettings.violation_reset_minutes} minute(s).` +
            'Provide at least one argument (days, hours, or minutes) to set the violation reset time.',
          flags: MessageFlags.Ephemeral
        })
        return
      }

      days = days ?? 0
      hours = hours ?? 0
      minutes = minutes ?? 0

      serverSettings.violation_reset_days = days
      serverSettings.violation_reset_hours = hours
      serverSettings.violation_reset_minutes = minutes

      // Overflow from minutes to hours
      if (serverSettings.violation_reset_minutes >= 60) {
        const extraHours = Math.floor(serverSettings.violation_reset_minutes / 60)
        serverSettings.violation_reset_hours += extraHours
        serverSettings.violation_reset_minutes = serverSettings.violation_reset_minutes % 60
      }

      // Overflow from hours to days
      if (serverSettings.violation_reset_hours >= 24) {
        const extraDays = Math.floor(serverSettings.violation_reset_hours / 24)
        serverSettings.violation_reset_days += extraDays
        serverSettings.violation_reset_hours = serverSettings.violation_reset_hours % 24
      }

      await serverSettings.save()

      await interaction.reply({
        content:
          'Violation reset time is now ' +
          `${serverSettings.violation_reset_days} day(s), ` +
          `${serverSettings.violation_reset_hours} hour(s), ` +
          `${serverSettings.violation_reset_minutes} minute(s).`,
        flags: MessageFlags.Ephemeral
      })

      writeLog(
        `Set violation reset time for guild ${guildId} by ${interaction.user.tag}: ` +
        `${serverSettings.violation_reset_days}d ` +
        `${serverSettings.violation_reset_hours}h ` +
        `${serverSettings.violation_reset_minutes}m`
      )
    } catch (error) {
      writeLog(`Failed to set violation reset time for guild ${guildId}: ${error}`)
      await interaction.reply({
        content: 'An error occurred while setting the violation reset time. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
