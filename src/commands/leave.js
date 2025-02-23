const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { getVoiceConnection } = require('@discordjs/voice')
const { stopMonitoring } = require('../audio/voice-monitor')
const { writeLog } = require('../utils/logger')

/**
 * Leave the current voice channel.
 * @param {string} guildId Guild ID of the voice channel the bot is in.
 * @returns 
 */
async function doForceLeave(guildId) {
  const connection = getVoiceConnection(guildId)
  if (!connection) return false
  stopMonitoring()
  connection.destroy()
  writeLog('Successfully left the voice channel and stopped monitoring.')
  return true
}

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
      await doForceLeave(interaction.guild.id)
      await interaction.reply({
        content: 'Left the voice channel.',
        flags: MessageFlags.Ephemeral
      })
    } catch (error) {
      writeLog(`Error leaving voice channel: ${error}`)
      await interaction.reply({
        content: 'Failed to leave the voice channel.',
        flags: MessageFlags.Ephemeral
      })
    }
  },
  doForceLeave
}
