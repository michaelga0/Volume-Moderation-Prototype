const { ServerSettings } = require('../../../src/database/init-db')
const { validate, failValidation } = require('../../../src/database/punishment-validator')
const { writeLog } = require('../../../src/utils/logger')
const setKickThreshold = require('../../../src/commands/set-kick-threshold')

jest.mock('../../../src/database/init-db', () => ({
  ServerSettings: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../../src/database/punishment-validator', () => ({
  validate: jest.fn(),
  failValidation: jest.fn()
}))

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

describe('setkickthreshold', () => {
  let interaction

  beforeEach(() => {
    interaction = {
      guildId: 'testGuildId',
      user: { tag: 'Tester#1234' },
      options: { getInteger: jest.fn() },
      reply: jest.fn()
    }
    ServerSettings.findOne.mockReset()
    ServerSettings.create.mockReset()
    validate.mockReset()
    failValidation.mockReset()
    writeLog.mockReset()
  })

  it('creates new server settings if none exist and no threshold given', async () => {
    ServerSettings.findOne.mockResolvedValue(null)
    ServerSettings.create.mockResolvedValue({ kick_enabled: true, kick_threshold: 20 })
    interaction.options.getInteger.mockReturnValue(null)
    await setKickThreshold.execute(interaction)
    expect(ServerSettings.create).toHaveBeenCalledWith({ guild_id: 'testGuildId' })
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Current kick threshold: **20**\nUsage: /setkickthreshold threshold:<integer>',
      flags: 64
    })
  })

  it('returns if kick not enabled', async () => {
    ServerSettings.findOne.mockResolvedValue({ kick_enabled: false })
    interaction.options.getInteger.mockReturnValue(10)
    await setKickThreshold.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Kick is not enabled. Enable it before using this command.',
      flags: 64
    })
  })

  it('returns if validate fails', async () => {
    ServerSettings.findOne.mockResolvedValue({ kick_enabled: true })
    validate.mockResolvedValue(true)
    await setKickThreshold.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'We encountered an error. Server settings have been reset to default. Please try again.',
      flags: 64
    })
  })

  it('shows current threshold if user provides no threshold', async () => {
    ServerSettings.findOne.mockResolvedValue({ kick_enabled: true, kick_threshold: 30 })
    validate.mockResolvedValue(false)
    interaction.options.getInteger.mockReturnValue(null)
    await setKickThreshold.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Current kick threshold: **30**\nUsage: /setkickthreshold threshold:<integer>',
      flags: 64
    })
  })

  it('calls failValidation if mute_threshold >= newThreshold', async () => {
    ServerSettings.findOne.mockResolvedValue({
      guild_id: 'testGuildId',
      kick_enabled: true,
      mute_enabled: true,
      mute_threshold: 10
    })
    validate.mockResolvedValue(false)
    interaction.options.getInteger.mockReturnValue(10)
    await setKickThreshold.execute(interaction)
    expect(failValidation).toHaveBeenCalledWith(interaction, 'testGuildId')
  })

  it('calls failValidation if timeout_threshold >= newThreshold', async () => {
    ServerSettings.findOne.mockResolvedValue({
      guild_id: 'testGuildId',
      kick_enabled: true,
      mute_enabled: false,
      timeout_enabled: true,
      timeout_threshold: 15
    })
    validate.mockResolvedValue(false)
    interaction.options.getInteger.mockReturnValue(15)
    await setKickThreshold.execute(interaction)
    expect(failValidation).toHaveBeenCalledWith(interaction, 'testGuildId')
  })

  it('sets threshold when conditions pass', async () => {
    const mockSettings = {
      guild_id: 'testGuildId',
      kick_enabled: true,
      mute_enabled: false,
      timeout_enabled: false,
      kick_threshold: 15,
      save: jest.fn()
    }
    ServerSettings.findOne.mockResolvedValue(mockSettings)
    validate.mockResolvedValue(false)
    interaction.options.getInteger.mockReturnValue(30)
    await setKickThreshold.execute(interaction)
    expect(mockSettings.save).toHaveBeenCalled()
    expect(mockSettings.kick_threshold).toBe(30)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Kick threshold set to **30**.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith(
      'Kick threshold set to 30 for guild testGuildId by Tester#1234'
    )
  })

  it('replies with error if an exception is thrown', async () => {
    ServerSettings.findOne.mockRejectedValue(new Error('DB error'))
    await setKickThreshold.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'An error occurred while setting the kick threshold. Please try again later.',
      flags: 64
    })
  })
})
