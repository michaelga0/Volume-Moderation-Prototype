const { executePunishment } = require('../../../src/moderation/punish')
const { writeLog } = require('../../../src/utils/logger')
const { sendDM } = require('../../../src/utils/direct-message')
const { MUTE_STATUS, TIMEOUT_STATUS, KICK_STATUS } = require('../../../src/utils/constants')

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

jest.mock('../../../src/utils/direct-message', () => ({
  sendDM: jest.fn()
}))

describe('executePunishment', () => {
  let mockMember, mockViolation, mockServerSettings

  beforeEach(() => {
    mockMember = {
      user: { tag: 'TestUser#1234' },
      guild: { name: 'TestGuild' },
      voice: {
        channel: {},
        setMute: jest.fn()
      },
      timeout: jest.fn(),
      kick: jest.fn()
    }
    mockViolation = {
      punishment_status: 0,
      save: jest.fn()
    }
    mockServerSettings = {
      timeout_duration: 5
    }
    writeLog.mockReset()
    sendDM.mockReset()
    mockMember.voice.setMute.mockReset()
    mockMember.timeout.mockReset()
    mockMember.kick.mockReset()
    mockViolation.save.mockReset()
  })

  it('mutes the user if nextPun is "mute"', async () => {
    const nextPun = { name: 'mute' }
    await executePunishment(mockMember, mockViolation, nextPun, mockServerSettings)
    expect(sendDM).toHaveBeenCalledWith(
      mockMember,
      'You will be muted in the server "TestGuild" for repeated volume violations.'
    )
    expect(mockMember.voice.setMute).toHaveBeenCalledWith(true, 'Repeated volume violations')
    expect(mockViolation.punishment_status).toBe(MUTE_STATUS)
    expect(mockViolation.save).toHaveBeenCalled()
    expect(writeLog).toHaveBeenCalledWith('Successfully executed punishment mute for TestUser#1234')
  })

  it('times out the user if nextPun is "timeout"', async () => {
    const nextPun = { name: 'timeout' }
    await executePunishment(mockMember, mockViolation, nextPun, mockServerSettings)
    expect(sendDM).toHaveBeenCalledWith(
      mockMember,
      'You will be timed out for 5 minute(s) in the server "TestGuild" for repeated volume violations.'
    )
    expect(mockMember.timeout).toHaveBeenCalledWith(5 * 60000, 'Repeated volume violations')
    expect(mockViolation.punishment_status).toBe(TIMEOUT_STATUS)
    expect(mockViolation.save).toHaveBeenCalled()
    expect(writeLog).toHaveBeenCalledWith('Successfully executed punishment timeout for TestUser#1234')
  })

  it('kicks the user if nextPun is "kick"', async () => {
    const nextPun = { name: 'kick' }
    await executePunishment(mockMember, mockViolation, nextPun, mockServerSettings)
    expect(sendDM).toHaveBeenCalledWith(
      mockMember,
      'You will be kicked from the server "TestGuild" for repeated volume violations.'
    )
    expect(mockMember.kick).toHaveBeenCalledWith('Repeated volume violations')
    expect(mockViolation.punishment_status).toBe(KICK_STATUS)
    expect(mockViolation.save).toHaveBeenCalled()
    expect(writeLog).toHaveBeenCalledWith('Successfully executed punishment kick for TestUser#1234')
  })

  it('logs error if a punishment fails', async () => {
    const nextPun = { name: 'mute' }
    mockMember.voice.setMute.mockRejectedValueOnce(new Error('No permission'))
    await executePunishment(mockMember, mockViolation, nextPun, mockServerSettings)
    expect(writeLog).toHaveBeenCalledWith(expect.stringContaining('Failed to mute TestUser#1234: Error: No permission'))
  })
})
