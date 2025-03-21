const fs = require('fs')
const path = require('path')
const prism = require('prism-media')
const { PassThrough } = require('stream')

function createMockOpusStream() {
  const filePath = path.join(__dirname, '../sample-audio/test-audio.pcm')
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const fileStream = fs.createReadStream(filePath)
  const opusEncoder = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 })
  const pass = new PassThrough()
  fileStream.pipe(opusEncoder).pipe(pass)
  return pass
}

const mockGuild = { id: 'mockGuildId' }

const mockMember = {
  id: '12345',
  user: { bot: false, id: '12345', tag: 'TestUser#1234' },
  guild: mockGuild
}

const mockMember2 = {
  id: '67890',
  user: { bot: false, id: '67890', tag: 'SecondUser#5678' },
  guild: mockGuild
}

const mockVoiceConnection = {
  destroy: jest.fn(),
  receiver: { subscribe: jest.fn(() => createMockOpusStream()) },
  joinConfig: { channelId: 'mockChannelId' }
}

const mockVoiceChannel = {
  name: 'Mock Test Channel',
  guild: mockGuild,
  members: {
    forEach: jest.fn(callback => {
      callback(mockMember)
    }),
    filter: jest.fn(callback => [mockMember].filter(callback))
  }
}

const mockVoiceChannel2 = {
  name: 'Second Mock Channel',
  guild: mockGuild,
  members: {
    forEach: jest.fn(callback => {
      callback(mockMember)
      callback(mockMember2)
    }),
    filter: jest.fn(callback => [mockMember, mockMember2].filter(callback))
  }
}

module.exports = {
  EndBehaviorType: { Manual: 'manual' },
  getVoiceConnection: jest.fn().mockImplementation(() => mockVoiceConnection),
  joinVoiceChannel: jest.fn().mockImplementation(() => mockVoiceConnection),
  mockVoiceChannel,
  mockVoiceChannel2
}
