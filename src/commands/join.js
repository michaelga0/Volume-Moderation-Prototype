const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice')
const { startMonitoring } = require('../audio/voice-monitor')
const { writeLog } = require('../utils/logger')
const { doForceLeave } = require('./leave')
const { ServerSettings } = require('../database/init-db')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join a voice channel and begin monitoring'),
  async execute(interaction) {
    try {

      let serverSettings = await ServerSettings.findOne({
        where: { guild_id: interaction.guild.id }
      })
      if (!serverSettings) {
        await ServerSettings.create({
          guild_id: interaction.guild.id
        })
      }

      const existingConnection = getVoiceConnection(interaction.guild.id)
      if (existingConnection) {
        // Force-leave with no channel check, same code as /leave except skipping the ephemeral part
        await doForceLeave(interaction.guild.id)
      }

      const member = await interaction.guild.members.fetch(interaction.user.id)
      const voiceChannel = member.voice.channel
      if (!voiceChannel) {
        return interaction.reply({
          content: 'Please join a voice channel first.',
          flags: MessageFlags.Ephemeral
        })
      }

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false
      })

      // Pass the client (interaction.client) so we can attach voiceState listener if needed
      startMonitoring(interaction.client, connection, voiceChannel)

      await interaction.reply({
        content: 'Joined the voice channel.',
        flags: MessageFlags.Ephemeral
      })
      writeLog(`Joined and started monitoring channel: ${voiceChannel.name}`)
    } catch (error) {
      writeLog(`Error joining voice channel: ${error}`)
      await interaction.reply({
        content: 'Failed to join the voice channel.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
