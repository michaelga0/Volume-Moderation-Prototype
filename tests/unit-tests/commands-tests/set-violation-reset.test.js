const { ServerSettings } = require('../../../src/database/init-db')
const { writeLog } = require('../../../src/utils/logger')
const setViolationReset = require('../../../src/commands/set-violation-reset')

jest.mock('../../../src/database/init-db', () => ({
  ServerSettings: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

describe('set-violation-reset', () => {
  let interaction

  beforeEach(() => {
    interaction = {
      guildId: 'testGuildId',
      user: { tag: 'Tester#1234' },
      options: {
        getInteger: jest.fn()
      },
      reply: jest.fn()
    }
    ServerSettings.findOne.mockReset()
    ServerSettings.create.mockReset()
    writeLog.mockReset()
  })

  it('creates new server settings if none exist and no arguments provided', async () => {
    ServerSettings.findOne.mockResolvedValueOnce(null)
    ServerSettings.create.mockResolvedValueOnce({
      violation_reset_enabled: true,
      violation_reset_days: 2,
      violation_reset_hours: 3,
      violation_reset_minutes: 10
    })
    interaction.options.getInteger.mockReturnValue(null)
    await setViolationReset.execute(interaction)
    expect(ServerSettings.create).toHaveBeenCalledWith({ guild_id: 'testGuildId' })
    expect(interaction.reply).toHaveBeenCalledWith({
      content:
        'Current violation reset time is 2 day(s), 3 hour(s), 10 minute(s).Provide at least one argument (days, hours, or minutes) to set the violation reset time.',
      flags: 64
    })
  })

  it('returns if violation_reset_enabled is false', async () => {
    ServerSettings.findOne.mockResolvedValueOnce({ violation_reset_enabled: false })
    await setViolationReset.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Violation reset is not enabled. Enable it before using this command.',
      flags: 64
    })
  })

  it('shows current time if all null and violation_reset_enabled is true', async () => {
    ServerSettings.findOne.mockResolvedValueOnce({
      violation_reset_enabled: true,
      violation_reset_days: 1,
      violation_reset_hours: 0,
      violation_reset_minutes: 30
    })
    interaction.options.getInteger.mockReturnValue(null)
    await setViolationReset.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content:
        'Current violation reset time is 1 day(s), 0 hour(s), 30 minute(s).Provide at least one argument (days, hours, or minutes) to set the violation reset time.',
      flags: 64
    })
  })

  it('sets the time correctly with overflow', async () => {
    const mockSettings = {
      violation_reset_enabled: true,
      violation_reset_days: 0,
      violation_reset_hours: 0,
      violation_reset_minutes: 0,
      save: jest.fn()
    }
    ServerSettings.findOne.mockResolvedValue(mockSettings)
    interaction.options.getInteger
      .mockReturnValueOnce(2)   
      .mockReturnValueOnce(26)  
      .mockReturnValueOnce(130)
    await setViolationReset.execute(interaction)
    expect(mockSettings.violation_reset_days).toBe(3)
    expect(mockSettings.violation_reset_hours).toBe(4)
    expect(mockSettings.violation_reset_minutes).toBe(10)
    expect(mockSettings.save).toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Violation reset time is now 3 day(s), 4 hour(s), 10 minute(s).',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith(
      'Set violation reset time for guild testGuildId by Tester#1234: 3d 4h 10m'
    )
  })

  it('handles errors', async () => {
    ServerSettings.findOne.mockRejectedValue(new Error('fail'))
    await setViolationReset.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'An error occurred while setting the violation reset time. Please try again later.',
      flags: 64
    })
  })
})
