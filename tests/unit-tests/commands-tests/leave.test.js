const { stopMonitoring } = require('../../../src/audio/voice-monitor')
const { doForceLeave } = require('../../../src/commands/leave')
const leaveCommand = require('../../../src/commands/leave')

jest.mock('@discordjs/voice', () => ({
  getVoiceConnection: jest.fn()
}))

jest.mock('../../../src/audio/voice-monitor', () => ({
  stopMonitoring: jest.fn()
}))
jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

const { getVoiceConnection } = require('@discordjs/voice')

describe('doForceLeave', () => {
  it('returns false if no connection', async () => {
    getVoiceConnection.mockReturnValueOnce(null)
    const result = await doForceLeave('guildId')
    expect(result).toBe(false)
    expect(stopMonitoring).not.toHaveBeenCalled()
  })

  it('destroys connection and returns true if connection exists', async () => {
    const mockConnection = { destroy: jest.fn() }
    getVoiceConnection.mockReturnValueOnce(mockConnection)
    const result = await doForceLeave('guildId')
    expect(result).toBe(true)
    expect(stopMonitoring).toHaveBeenCalled()
    expect(mockConnection.destroy).toHaveBeenCalled()
  })
})

describe('execute', () => {
  let mockInteraction

  beforeEach(() => {
    mockInteraction = {
      guild: { id: 'guildId', members: { fetch: jest.fn() } },
      user: { id: 'userId' },
      reply: jest.fn()
    }
    getVoiceConnection.mockReset()
    stopMonitoring.mockReset()
  })

  it('replies with error if no connection', async () => {
    getVoiceConnection.mockReturnValueOnce(null)
    await leaveCommand.execute(mockInteraction)
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'I am not currently in a voice channel in this server.',
      flags: 64
    })
  })

  it('replies with error if user not in same channel', async () => {
    const mockConnection = { joinConfig: { channelId: '123' } }
    getVoiceConnection.mockReturnValueOnce(mockConnection)
    mockInteraction.guild.members.fetch.mockResolvedValueOnce({
      voice: { channel: { id: '456' } }
    })
    await leaveCommand.execute(mockInteraction)
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'You must be in the same voice channel as me to make me leave.',
      flags: 64
    })
  })

  it('replies success if user in same channel', async () => {
    const mockConnection = { joinConfig: { channelId: '123' } }
    getVoiceConnection.mockReturnValueOnce(mockConnection)
    mockInteraction.guild.members.fetch.mockResolvedValueOnce({
      voice: { channel: { id: '123' } }
    })
    await leaveCommand.execute(mockInteraction)
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Left the voice channel.',
      flags: 64
    })
  })

  it('replies with failure if error is thrown', async () => {
    getVoiceConnection.mockImplementation(() => { throw new Error('fail') })
    await leaveCommand.execute(mockInteraction)
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Failed to leave the voice channel.',
      flags: 64
    })
  })
})
