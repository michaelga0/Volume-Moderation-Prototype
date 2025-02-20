const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { joinVoiceChannel } = require('@discordjs/voice')
const { startMonitoring } = require('../audio/voiceMonitor')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join a voice channel and begin monitoring'),
  async execute(interaction) {
    try {
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
      startMonitoring(connection, voiceChannel, 5000)
      await interaction.reply({
        content: 'Monitoring started.',
        flags: MessageFlags.Ephemeral
      })
    } catch (error) {
      console.error('Error joining voice channel:', error)
      await interaction.reply({
        content: 'Failed to join the voice channel.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
