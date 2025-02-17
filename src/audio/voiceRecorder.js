const fs = require('fs')
const prism = require('prism-media')
const { EndBehaviorType } = require('@discordjs/voice')

const userStreams = new Map()

function startAudioStream(connection, voiceChannel) {
  const receiver = connection.receiver

  voiceChannel.members.forEach(member => {
    if (member.user.bot) return

    const userId = member.id

    const audioStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.Manual }
    })

    // Decode from Opus to raw PCM
    const opusDecoder = new prism.opus.Decoder({
      frameSize: 960,
      channels: 2,
      rate: 48000
    })

    // Create a write stream to a file
    const outputFile = fs.createWriteStream(`./src/audio/${userId}.pcm`)

    audioStream.pipe(opusDecoder).pipe(outputFile)

    userStreams.set(userId, { audioStream, opusDecoder, outputFile })
  })
}

function stopAudioStreams() {
  for (const [userId, { audioStream, opusDecoder, outputFile }] of userStreams) {
    try {
      audioStream.destroy()
      opusDecoder.destroy()
      outputFile.end()
    } catch (err) {
      console.error(`Failed to stop streams for user ${userId}:`, err)
    }
  }
  userStreams.clear()
}

module.exports = { startAudioStream, stopAudioStreams }
