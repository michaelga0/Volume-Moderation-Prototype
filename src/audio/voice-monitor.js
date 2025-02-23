const { EndBehaviorType, getVoiceConnection } = require('@discordjs/voice')
const prism = require('prism-media')
const { writeLog } = require('../utils/logger')

// 48k samples/sec, 2 channels, 16 bits => 4 bytes/sample * 48k = 192k bytes/sec
const BYTES_PER_SECOND = 48000 * 4
// Duration in seconds for volume checks
const DURATION = 3
const WINDOW_SIZE = BYTES_PER_SECOND * DURATION
// Volume above this RMS threshold is considered too loud
const DEFAULT_THRESHOLD = 10000

// userId -> { opus, decoder, buffer, member }
const recorders = new Map()

let monitoredConnection = null
let monitoredChannel = null
let currentThreshold = DEFAULT_THRESHOLD
let voiceStateListenerAttached = false
let botClient = null

/**
 * Initializer
 * @param {Client} client - The Discord.js client instance.
 */
function initVoiceStateListener(client) {
  if (!voiceStateListenerAttached) {
    voiceStateListenerAttached = true
    botClient = client
    botClient.on('voiceStateUpdate', handleVoiceStateUpdate)
  }
}

/**
 * Monitors all current (non-bot) members in the given voiceChannel.
 * 
 * @param {Client} client - The Discord.js client instance.
 * @param {VoiceConnection} connection - The established voice connection for the target channel.
 * @param {VoiceChannel} voiceChannel - The voice channel to monitor.
 * @param {number} [threshold=DEFAULT_THRESHOLD] - The RMS volume threshold considered too loud.
 */
function startMonitoring(client, connection, voiceChannel, threshold = DEFAULT_THRESHOLD) {
  initVoiceStateListener(client)
  monitoredConnection = connection
  monitoredChannel = voiceChannel
  currentThreshold = threshold

  const receiver = connection.receiver
  voiceChannel.members.forEach(member => {
    if (member.user.bot || recorders.has(member.id)) return
    createRecorder(member, receiver)
  })
  writeLog(`Started monitoring channel: ${voiceChannel.name}`)
}

/**
 * Stops monitoring everyone in the channel and resets.
 */
function stopMonitoring() {
  for (const [id, r] of recorders) {
    try {
      r.opus.destroy()
      r.decoder.destroy()
      writeLog(`Stopped monitoring user: ${r.member.user.tag}`)
    } catch (error) {
      writeLog(`Error destroying stream for ${r.member.user.tag}: ${error}`)
    }
  }
  recorders.clear()
  monitoredConnection = null
  monitoredChannel = null
  writeLog('Stopped all monitoring streams.')
}

/**
 * Called whenever any voice state changes in any guild. Adds new arrivals, removes departures.
 */
function handleVoiceStateUpdate(oldState, newState) {

  if (!monitoredConnection || !monitoredChannel) return

  const user = newState.member.user
  if (user.bot) return

  if (oldState.channelId === monitoredChannel.id && newState.channelId !== oldState.channelId) {
    removeRecorder(oldState.id)
    if (isChannelEmpty(monitoredChannel)) {
      const savedChannel = monitoredChannel
      stopMonitoring()
      const connection = getVoiceConnection(savedChannel.guild.id)
      if (connection) {
        connection.destroy()
        writeLog(`No more human users in ${savedChannel.name}. Bot left the voice channel.`)
      }
      return
    }
  }
  else if (
    newState.channelId === monitoredChannel.id && 
    newState.channelId !== oldState.channelId
  ) {
    const receiver = monitoredConnection.receiver
    const userId = newState.id
    if (!recorders.has(userId)) {
      createRecorder(newState.member, receiver)
    }
  }
}

/**
 * Create an Opus stream for a user and decode to PCM.
 */
function createRecorder(member, receiver) {
  const opus = receiver.subscribe(member.id, { end: { behavior: EndBehaviorType.Manual } })
  const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 })
  let buffer = Buffer.alloc(0)

  opus.pipe(decoder)
  decoder.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])
    if (buffer.length >= WINDOW_SIZE) {
      const rms = computeRMS(buffer)
      if (rms > currentThreshold && botClient) {
        botClient.emit('thresholdExceeded', {
          member,
          rms,
          guildId: member.guild.id
        })
      }
      buffer = Buffer.alloc(0)
    }
  })

  recorders.set(member.id, { opus, decoder, buffer, member })
  writeLog(`Started monitoring user: ${member.user.tag}`)
}

/**
 * Returns true if the channel has no non-bot users.
 */
function removeRecorder(userId) {
  if (!recorders.has(userId)) return
  const { opus, decoder, member } = recorders.get(userId)
  opus.destroy()
  decoder.destroy()
  recorders.delete(userId)
  writeLog(`Stopped monitoring user: ${member.user.tag}`)
}

/**
 * Returns true if the channel has no non-bot users.
 */
function isChannelEmpty(channel) {
  const humans = channel.members.filter(m => !m.user.bot)
  return humans.size === 0
}

/**
 * Use the Root Mean Squared method to calculate loudness.
 */
function computeRMS(buf) {
  let sumSq = 0
  for (let i = 0; i < buf.length; i += 2) {
    const sample = buf.readInt16LE(i)
    sumSq += sample * sample
  }
  return Math.sqrt(sumSq / (buf.length / 2))
}

module.exports = {
  startMonitoring,
  stopMonitoring
}
