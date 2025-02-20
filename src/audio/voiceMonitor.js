const { EndBehaviorType } = require('@discordjs/voice')
const prism = require('prism-media')

// 48k samples/sec, 2 channels, 16 bits => 4 bytes/sample * 48k = 192k bytes/sec
const BYTES_PER_SECOND = 48000 * 4
// Duration in seconds for volume checks
const DURATION = 3
const WINDOW_SIZE = BYTES_PER_SECOND * DURATION
// Volume above this RMS threshold is considered "too loud"
const THRESHOLD = 5000

const recorders = new Map()

function startMonitoring(connection, voiceChannel, threshold = THRESHOLD) {
  const receiver = connection.receiver
  voiceChannel.members.forEach(member => {
    if (member.user.bot || recorders.has(member.id)) return
    const opus = receiver.subscribe(member.id, { end: { behavior: EndBehaviorType.Manual } })
    const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 })
    let buffer = Buffer.alloc(0)
    opus.pipe(decoder)
    decoder.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk])
      if (buffer.length >= WINDOW_SIZE) {
        if (computeRMS(buffer) > threshold) member.send("You're too loud. Please lower your volume.")
        buffer = Buffer.alloc(0)
      }
    })
    recorders.set(member.id, { opus, decoder, buffer })
  })
}

function stopMonitoring() {
  for (const [id, r] of recorders) {
    r.opus.destroy()
    r.decoder.destroy()
  }
  recorders.clear()
}

function computeRMS(buf) {
  let sumSq = 0
  for (let i = 0; i < buf.length; i += 2) {
    const sample = buf.readInt16LE(i)
    sumSq += sample * sample
  }
  return Math.sqrt(sumSq / (buf.length / 2))
}

module.exports = { startMonitoring, stopMonitoring }
