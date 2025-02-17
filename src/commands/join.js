const { SlashCommandBuilder } = require('discord.js')
const { joinVoiceChannel } = require('@discordjs/voice')
const { startAudioStream } = require('../audio/voiceRecorder')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join a voice channel and begin monitoring'),
  async execute(interaction) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id)
      const voiceChannel = member.voice.channel

      if (!voiceChannel) {
        console.log('User is not in a voice channel.')
        return interaction.reply({
          content: 'Please join a voice channel first.',
          ephemeral: true
        })
      }

      console.log(`Attempting to join the voice channel: ${voiceChannel.name}`)

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false
      })

      // Start capturing audio from everyone in the channel
      startAudioStream(connection, voiceChannel)

      console.log('Joined voice channel successfully.')
      await interaction.reply({
        content: 'Successfully joined the voice channel and started recording!',
        ephemeral: true
      })
    } catch (error) {
      console.error('Error joining voice channel:', error)
      await interaction.reply({
        content: 'Failed to join the voice channel.',
        ephemeral: true
      })
    }
  }
}
