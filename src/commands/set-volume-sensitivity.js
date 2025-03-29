const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, VoiceChannel } = require('discord.js')
const { ServerSettings } = require('../database/init-db')
const { writeLog } = require('../utils/logger')
const { getVoiceConnection } = require('@discordjs/voice')
const { doForceLeave } = require('./leave')
const { doJoin } = require('./join')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setvolumesensitivity')
    .setDescription('Set the volume sensitivity for this server (0-100).')
    .addIntegerOption(option =>
      option
        .setName('sensitivity')
        .setDescription('Volume sensitivity as a percentage (0-100)')
        .setRequired(false)
    )
    // Requires Manage Guild permission for the user invoking the command.
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const guildId = interaction.guildId
    const sensitivity = interaction.options.getInteger('sensitivity')
    try {
      let serverSettings = await ServerSettings.findOne({ where: { guild_id: guildId } })
      if (!serverSettings) {
        serverSettings = await ServerSettings.create({ guild_id: guildId })
      }

      if (sensitivity === null) {
        await interaction.reply({
          content: `Current volume sensitivity is **${serverSettings.volume_sensitivity}**.`,
          flags: MessageFlags.Ephemeral
        })
        return
      }

      serverSettings.volume_sensitivity = sensitivity
      await serverSettings.save()


      writeLog(`Set volume sensitivity for guild ${guildId} by ${interaction.user.tag} to ${sensitivity}`)

      const connection = getVoiceConnection(guildId)
      if (connection) {
        const voiceChannel = interaction.guild.members.me.voice.channel
        await doForceLeave(guildId)
        // Re-join using the same interaction, reusing the updated serverSettings
        await doJoin(voiceChannel, interaction.client, serverSettings)
      }

      await interaction.reply({
        content: `Volume sensitivity has been set to **${sensitivity}**.`,
        flags: MessageFlags.Ephemeral
      })
    } catch (error) {
      writeLog(`Failed to set volume sensitivity for guild ${guildId}: ${error}`)
      await interaction.reply({
        content: 'An error occurred while setting volume sensitivity. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
