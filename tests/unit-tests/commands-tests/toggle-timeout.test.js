const { ServerSettings } = require('../../../src/database/init-db')
const { validate } = require('../../../src/database/punishment-validator')
const { writeLog } = require('../../../src/utils/logger')
const {
  DEFAULT_MUTE_THRESHOLD,
  DEFAULT_TIMEOUT_THRESHOLD,
  DEFAULT_KICK_THRESHOLD
} = require('../../../src/utils/constants')
const toggleTimeout = require('../../../src/commands/toggle-timeout')

jest.mock('../../../src/database/init-db', () => ({
  ServerSettings: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../../src/database/punishment-validator', () => ({
  validate: jest.fn()
}))

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

describe('toggle-timeout', () => {
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
    validate.mockReset()
    writeLog.mockReset()
  })

  it('creates new server settings if none exist', async () => {
    ServerSettings.findOne.mockResolvedValueOnce(null)
    ServerSettings.create.mockResolvedValueOnce({ timeout_enabled: false, save: jest.fn() })
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleTimeout.execute(interaction)
    expect(ServerSettings.create).toHaveBeenCalledWith({ guild_id: 'testGuildId' })
  })

  it('enables timeout and does not reset if validate returns false', async () => {
    const mockSave = jest.fn()
    ServerSettings.findOne.mockResolvedValueOnce({ timeout_enabled: false, save: mockSave })
    validate.mockResolvedValueOnce(false)
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleTimeout.execute(interaction)
    expect(mockSave).toHaveBeenCalled()
    expect(validate).toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Timeout has been **enabled**.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith('Timeout toggled to true for guild testGuildId by Tester#1234')
  })

  it('enables timeout and resets thresholds if validate returns true', async () => {
    const mockSave = jest.fn()
    ServerSettings.findOne.mockResolvedValueOnce({ timeout_enabled: false, save: mockSave })
    validate.mockResolvedValueOnce(true)
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleTimeout.execute(interaction)
    expect(validate).toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: `Thresholds have been reset to default:\nMute: ${DEFAULT_MUTE_THRESHOLD}, Timeout: ${DEFAULT_TIMEOUT_THRESHOLD}, Kick: ${DEFAULT_KICK_THRESHOLD}\nTimeout is now enabled.`,
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith(
      'Validation failed for guild testGuildId upon enabling timeout, thresholds reset to defaults.'
    )
  })

  it('disables timeout', async () => {
    const mockSave = jest.fn()
    ServerSettings.findOne.mockResolvedValueOnce({ timeout_enabled: true, save: mockSave })
    interaction.options.getBoolean.mockReturnValue(false)
    await toggleTimeout.execute(interaction)
    expect(mockSave).toHaveBeenCalled()
    expect(validate).not.toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Timeout has been **disabled**.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith('Timeout toggled to false for guild testGuildId by Tester#1234')
  })

  it('handles errors', async () => {
    ServerSettings.findOne.mockRejectedValueOnce(new Error('fail'))
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleTimeout.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'An error occurred while toggling the timeout setting. Please try again later.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith('Failed to toggle timeout for guild testGuildId: Error: fail')
  })
})
