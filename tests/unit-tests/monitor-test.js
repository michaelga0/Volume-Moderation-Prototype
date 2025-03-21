const { MockClient } = require('../mocks/mock-client')
const { getVoiceConnection, mockVoiceChannel, mockVoiceChannel2 } = require('../mocks/mock-voice')

// Delay in case voice monitor has paused monitoring for 3 seconds, prevents timeout error
const RECORDING_DELAY = 3000

beforeEach(() => {
  jest.resetModules()
  jest.isolateModules(() => {
    const voiceMonitor = require('../../src/audio/voice-monitor')
    startMonitoring = voiceMonitor.startMonitoring
    stopMonitoring = voiceMonitor.stopMonitoring
  })
})

describe('Monitor Tests', () => {
  it('single channel triggers thresholdExceeded at threshold 2500', done => {
    const client = new MockClient()
    const connection = getVoiceConnection()

    client.on('thresholdExceeded', () => {
      stopMonitoring()
      setTimeout(() => done(), RECORDING_DELAY)
    })

    startMonitoring(client, connection, mockVoiceChannel, 2500)
  })

  it('single channel triggers thresholdExceeded at threshold 7500', done => {
    const client = new MockClient()
    const connection = getVoiceConnection()

    client.on('thresholdExceeded', () => {
      stopMonitoring()
      setTimeout(() => done(), RECORDING_DELAY)
    })

    startMonitoring(client, connection, mockVoiceChannel, 7500)
  })

  it('single channel triggers thresholdExceeded at threshold 12500', done => {
    const client = new MockClient()
    const connection = getVoiceConnection()

    client.on('thresholdExceeded', () => {
      stopMonitoring()
      setTimeout(() => done(), RECORDING_DELAY)
    })

    startMonitoring(client, connection, mockVoiceChannel, 12500)
  })

  it('two-person channel triggers two thresholdExceeded events at threshold 2500', done => {
    const client = new MockClient()
    const connection = getVoiceConnection()
    let count = 0

    client.on('thresholdExceeded', () => {
      count += 1
      if (count === 2) {
        stopMonitoring()
        setTimeout(() => done(), RECORDING_DELAY)
      }
    })

    startMonitoring(client, connection, mockVoiceChannel2, 2500)
  })

  it('two-person channel triggers two thresholdExceeded events at threshold 7500', done => {
    const client = new MockClient()
    const connection = getVoiceConnection()
    let count = 0

    client.on('thresholdExceeded', () => {
      count += 1
      if (count === 2) {
        stopMonitoring()
        setTimeout(() => done(), RECORDING_DELAY)
      }
    })

    startMonitoring(client, connection, mockVoiceChannel2, 7500)
  })

  it('two-person channel triggers two thresholdExceeded events at threshold 12500', done => {
    const client = new MockClient()
    const connection = getVoiceConnection()
    let count = 0

    client.on('thresholdExceeded', () => {
      count += 1
      if (count === 2) {
        stopMonitoring()
        setTimeout(() => done(), RECORDING_DELAY)
      }
    })

    startMonitoring(client, connection, mockVoiceChannel2, 12500)
  })
})
