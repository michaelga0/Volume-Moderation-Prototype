const { ServerSettings } = require('../../../src/database/init-db')
const { writeLog } = require('../../../src/utils/logger')
const toggleViolationReset = require('../../../src/commands/toggle-violation-reset')

jest.mock('../../../src/database/init-db', () => ({
  ServerSettings: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

describe('toggle-violation-reset', () => {
  let interaction

  beforeEach(() => {
    interaction = {
      guildId: 'testGuildId',
      user: { tag: 'Tester#1234' },
      options: { getBoolean: jest.fn() },
      reply: jest.fn()
    }
    ServerSettings.findOne.mockReset()
    ServerSettings.create.mockReset()
    writeLog.mockReset()
  })

  it('creates new server settings if none exist', async () => {
    ServerSettings.findOne.mockResolvedValueOnce(null)
    ServerSettings.create.mockResolvedValueOnce({
      violation_reset_enabled: false,
      save: jest.fn()
    })
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleViolationReset.execute(interaction)
    expect(ServerSettings.create).toHaveBeenCalledWith({ guild_id: 'testGuildId' })
  })

  it('enables violation reset', async () => {
    const mockSave = jest.fn()
    ServerSettings.findOne.mockResolvedValueOnce({ violation_reset_enabled: false, save: mockSave })
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleViolationReset.execute(interaction)
    expect(mockSave).toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Violation reset has been **enabled**.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith(
      'Violation reset set to true for guild testGuildId by user Tester#1234'
    )
  })

  it('disables violation reset', async () => {
    const mockSave = jest.fn()
    ServerSettings.findOne.mockResolvedValueOnce({ violation_reset_enabled: true, save: mockSave })
    interaction.options.getBoolean.mockReturnValue(false)
    await toggleViolationReset.execute(interaction)
    expect(mockSave).toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Violation reset has been **disabled**.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith(
      'Violation reset set to false for guild testGuildId by user Tester#1234'
    )
  })

  it('handles errors', async () => {
    ServerSettings.findOne.mockRejectedValue(new Error('fail'))
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleViolationReset.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'An error occurred while toggling violation reset. Please try again later.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith('Failed to toggle violation reset for guild testGuildId: Error: fail')
  })
})
