const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { getVoiceConnection } = require('@discordjs/voice')
const { stopMonitoring } = require('../audio/voiceMonitor')
const { writeLog } = require('../utils/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leaves the current voice channel'),
  async execute(interaction) {
    try {
      const connection = getVoiceConnection(interaction.guild.id)
      if (!connection) {
        return interaction.reply({
          content: 'I am not currently in a voice channel in this server.',
          flags: MessageFlags.Ephemeral
        })
      }

      const member = await interaction.guild.members.fetch(interaction.user.id)
      if (!member.voice.channel || member.voice.channel.id !== connection.joinConfig.channelId) {
        return interaction.reply({
          content: 'You must be in the same voice channel as me to make me leave.',
          flags: MessageFlags.Ephemeral
        })
      }
      stopMonitoring()
      connection.destroy()
      await interaction.reply({
        content: 'Left the voice channel and stopped recording.',
        flags: MessageFlags.Ephemeral
      })
      writeLog('Successfully left the voice channel and stopped recording.')
    } catch (error) {
      writeLog(`Error leaving voice channel: ${error}`)
      await interaction.reply({
        content: 'Failed to leave the voice channel.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
