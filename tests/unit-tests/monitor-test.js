const { MockClient } = require('../mocks/mock-client')
const { startMonitoring, stopMonitoring } = require('../../src/audio/voice-monitor')
const { getVoiceConnection, mockVoiceChannel } = require('../mocks/mock-voice')

beforeEach(() => {
  jest.resetModules()
})

describe('Monitor Tests', () => {
  it('Start monitoring, catch thresholdExceeded event, log RMS value, and stop monitoring', done => {
    const client = new MockClient()
    const connection = getVoiceConnection()

    client.on('thresholdExceeded', data => {
      console.log('Caught thresholdExceeded event:', data)
      stopMonitoring()
      console.log('Stopped monitoring after thresholdExceeded')
      done()
    })

    console.log('Invoking startMonitoring')
    startMonitoring(client, connection, mockVoiceChannel, 5000)
  })
})
