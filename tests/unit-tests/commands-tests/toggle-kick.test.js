const { ServerSettings } = require('../../../src/database/init-db')
const { validate } = require('../../../src/database/punishment-validator')
const { writeLog } = require('../../../src/utils/logger')
const {
  DEFAULT_MUTE_THRESHOLD,
  DEFAULT_TIMEOUT_THRESHOLD,
  DEFAULT_KICK_THRESHOLD
} = require('../../../src/utils/constants')
const toggleKick = require('../../../src/commands/toggle-kick')

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

describe('toggle-kick', () => {
  let interaction

  beforeEach(() => {
    interaction = {
      guildId: 'testGuildId',
      user: { tag: 'Tester#1234' },
      options: {
        getBoolean: jest.fn()
      },
      reply: jest.fn()
    }
    ServerSettings.findOne.mockReset()
    ServerSettings.create.mockReset()
    validate.mockReset()
    writeLog.mockReset()
  })

  it('creates new server settings if none exist', async () => {
    ServerSettings.findOne.mockResolvedValueOnce(null)
    ServerSettings.create.mockResolvedValueOnce({ kick_enabled: false, save: jest.fn() })
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleKick.execute(interaction)
    expect(ServerSettings.create).toHaveBeenCalledWith({ guild_id: 'testGuildId' })
  })

  it('enables kick and does not reset if validate returns false', async () => {
    const mockSave = jest.fn()
    ServerSettings.findOne.mockResolvedValueOnce({ kick_enabled: false, save: mockSave })
    validate.mockResolvedValueOnce(false)
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleKick.execute(interaction)
    expect(mockSave).toHaveBeenCalled()
    expect(validate).toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Kick has been **enabled**.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith('Kick toggled to true for guild testGuildId by Tester#1234')
  })

  it('enables kick and resets thresholds if validate returns true', async () => {
    const mockSave = jest.fn()
    ServerSettings.findOne.mockResolvedValueOnce({ kick_enabled: false, save: mockSave })
    validate.mockResolvedValueOnce(true)
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleKick.execute(interaction)
    expect(validate).toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: `Thresholds have been reset to default:\nMute: ${DEFAULT_MUTE_THRESHOLD}, Timeout: ${DEFAULT_TIMEOUT_THRESHOLD}, Kick: ${DEFAULT_KICK_THRESHOLD}\nKick is now enabled.`,
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith(
      'Validation failed for guild testGuildId upon enabling kick, thresholds reset to defaults.'
    )
  })

  it('disables kick', async () => {
    const mockSave = jest.fn()
    ServerSettings.findOne.mockResolvedValueOnce({ kick_enabled: true, save: mockSave })
    interaction.options.getBoolean.mockReturnValue(false)
    await toggleKick.execute(interaction)
    expect(mockSave).toHaveBeenCalled()
    expect(validate).not.toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Kick has been **disabled**.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith('Kick toggled to false for guild testGuildId by Tester#1234')
  })

  it('handles errors', async () => {
    ServerSettings.findOne.mockRejectedValueOnce(new Error('fail'))
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleKick.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'An error occurred while toggling the kick setting. Please try again later.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith('Failed to toggle kick for guild testGuildId: Error: fail')
  })
})
