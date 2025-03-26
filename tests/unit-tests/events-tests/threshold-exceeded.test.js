const event = require('../../../src/events/threshold-exceeded')
const { Violation, ServerSettings } = require('../../../src/database/init-db')
const { writeLog } = require('../../../src/utils/logger')
const { applyNextPunishment, calculateWarningsUntilNext } = require('../../../src/moderation/punishment-handler')
const { sendDM } = require('../../../src/utils/direct-message')

jest.mock('../../../src/database/init-db', () => ({
  Violation: {
    findOne: jest.fn(),
    create: jest.fn()
  },
  ServerSettings: {
    findOne: jest.fn()
  }
}))

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

jest.mock('../../../src/moderation/punishment-handler', () => ({
  applyNextPunishment: jest.fn(),
  calculateWarningsUntilNext: jest.fn()
}))

jest.mock('../../../src/utils/direct-message', () => ({
  sendDM: jest.fn()
}))

describe('thresholdExceeded event', () => {
  let mockMember, mockViolation, mockSettings

  beforeEach(() => {
    mockMember = {
      id: 'userId',
      user: { tag: 'TestUser#1234' },
      guild: {
        id: 'guildId',
        members: {
          fetch: jest.fn().mockResolvedValue({})
        }
      }
    }
    mockViolation = {
      user_id: 'userId',
      guild_id: 'guildId',
      violations_count: 2,
      punishment_status: 1,
      exempt: false,
      last_violation_at: new Date(Date.now() - 1000),
      save: jest.fn(),
      reload: jest.fn()
    }
    mockSettings = {
      violation_reset_days: 0,
      violation_reset_hours: 0,
      violation_reset_minutes: 0,
      violation_reset_enabled: true
    }
    Violation.findOne.mockReset()
    Violation.create.mockReset()
    ServerSettings.findOne.mockReset()
    writeLog.mockReset()
    applyNextPunishment.mockReset()
    calculateWarningsUntilNext.mockReset()
    sendDM.mockReset()
  })

  it('creates a new violation record if none exists', async () => {
    Violation.findOne.mockResolvedValueOnce(null)
    Violation.create.mockResolvedValueOnce(mockViolation)
    ServerSettings.findOne.mockResolvedValueOnce(mockSettings)
    await event.execute({ member: mockMember, rms: 1234, guildId: 'guildId' })
    expect(Violation.create).toHaveBeenCalledWith({
      user_id: mockMember.id,
      guild_id: 'guildId',
      violations_count: 0,
      punishment_status: 0,
      exempt: false
    })
  })

  it('resets violation if time exceeded', async () => {
    mockViolation.last_violation_at = new Date(Date.now() - 1000 * 60 * 60 * 25)
    mockSettings.violation_reset_days = 1
    mockSettings.violation_reset_hours = 0
    mockSettings.violation_reset_minutes = 0
    Violation.findOne.mockResolvedValueOnce(mockViolation)
    ServerSettings.findOne.mockResolvedValueOnce(mockSettings)
    await event.execute({ member: mockMember, rms: 1234, guildId: 'guildId' })
    expect(mockViolation.violations_count).toBe(1)
    expect(mockViolation.punishment_status).toBe(0)
    expect(mockViolation.save).toHaveBeenCalled()
  })

  it('does not reset if time not exceeded', async () => {
    mockViolation.last_violation_at = new Date(Date.now() - 1000)
    mockSettings.violation_reset_days = 1
    Violation.findOne.mockResolvedValueOnce(mockViolation)
    ServerSettings.findOne.mockResolvedValueOnce(mockSettings)
    await event.execute({ member: mockMember, rms: 999, guildId: 'guildId' })
    expect(mockViolation.violations_count).toBe(3)
    expect(mockViolation.save).toHaveBeenCalled()
  })

  it('calls applyNextPunishment and then reloads the violation', async () => {
    Violation.findOne.mockResolvedValueOnce(mockViolation)
    ServerSettings.findOne.mockResolvedValueOnce(mockSettings)
    await event.execute({ member: mockMember, rms: 1111, guildId: 'guildId' })
    expect(applyNextPunishment).toHaveBeenCalledWith(mockMember, mockViolation, mockSettings)
    expect(mockViolation.reload).toHaveBeenCalled()
  })

  it('ignores fetch error code 10007', async () => {
    Violation.findOne.mockResolvedValueOnce(mockViolation)
    ServerSettings.findOne.mockResolvedValueOnce(mockSettings)
    mockMember.guild.members.fetch.mockRejectedValueOnce({ code: 10007 })
    await expect(
      event.execute({ member: mockMember, rms: 1111, guildId: 'guildId' })
    ).resolves.not.toThrow()
  })

  it('throws on other fetch error codes', async () => {
    Violation.findOne.mockResolvedValueOnce(mockViolation)
    ServerSettings.findOne.mockResolvedValueOnce(mockSettings)
    mockMember.guild.members.fetch.mockRejectedValueOnce({ code: 999 })
    await event.execute({ member: mockMember, rms: 1111, guildId: 'guildId' })
    expect(writeLog).toHaveBeenCalledWith(expect.stringContaining('Failed to process threshold exceed'))
  })

  it('sends DM with warnings message if provided', async () => {
    Violation.findOne.mockResolvedValueOnce(mockViolation)
    ServerSettings.findOne.mockResolvedValueOnce(mockSettings)
    calculateWarningsUntilNext.mockReturnValue('You have 2 warnings left.')
    await event.execute({ member: mockMember, rms: 777, guildId: 'guildId' })
    expect(sendDM).toHaveBeenCalledWith(mockMember, expect.stringContaining('You have 2 warnings left.'))
  })

  it('handles error and logs if something goes wrong', async () => {
    Violation.findOne.mockRejectedValueOnce(new Error('fail'))
    await event.execute({ member: mockMember, rms: 444, guildId: 'guildId' })
    expect(writeLog).toHaveBeenCalledWith(
      `Failed to process threshold exceed for ${mockMember.user.tag}: Error: fail`
    )
  })
})
