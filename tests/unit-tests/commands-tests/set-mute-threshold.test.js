const { ServerSettings } = require('../../../src/database/init-db')
const { validate, failValidation } = require('../../../src/database/punishment-validator')
const { writeLog } = require('../../../src/utils/logger')
const setMuteThreshold = require('../../../src/commands/set-mute-threshold')

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

describe('setmutethreshold', () => {
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
    ServerSettings.create.mockResolvedValue({ mute_enabled: true, mute_threshold: 10 })
    interaction.options.getInteger.mockReturnValue(null)
    await setMuteThreshold.execute(interaction)
    expect(ServerSettings.create).toHaveBeenCalledWith({ guild_id: 'testGuildId' })
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Current mute threshold: **10**\nUsage: /setmutethreshold threshold:<integer>',
      flags: 64
    })
  })

  it('returns if mute not enabled', async () => {
    ServerSettings.findOne.mockResolvedValue({ mute_enabled: false })
    interaction.options.getInteger.mockReturnValue(10)
    await setMuteThreshold.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Mute is not enabled. Enable it before using this command.',
      flags: 64
    })
  })

  it('returns if validate fails', async () => {
    ServerSettings.findOne.mockResolvedValue({ mute_enabled: true })
    validate.mockResolvedValue(true)
    await setMuteThreshold.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'We encountered an error. Server settings have been reset to default. Please try again.',
      flags: 64
    })
  })

  it('shows current threshold if user provides no threshold', async () => {
    ServerSettings.findOne.mockResolvedValue({ mute_enabled: true, mute_threshold: 20 })
    validate.mockResolvedValue(false)
    interaction.options.getInteger.mockReturnValue(null)
    await setMuteThreshold.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Current mute threshold: **20**\nUsage: /setmutethreshold threshold:<integer>',
      flags: 64
    })
  })

  it('calls failValidation if newThreshold >= timeout_threshold', async () => {
    ServerSettings.findOne.mockResolvedValue({
      mute_enabled: true,
      timeout_enabled: true,
      timeout_threshold: 15,
      kick_enabled: false
    })
    validate.mockResolvedValue(false)
    interaction.options.getInteger.mockReturnValue(15)
    await setMuteThreshold.execute(interaction)
    expect(failValidation).toHaveBeenCalledWith(interaction, 'testGuildId')
  })

  it('calls failValidation if newThreshold >= kick_threshold', async () => {
    ServerSettings.findOne.mockResolvedValue({
      mute_enabled: true,
      timeout_enabled: false,
      kick_enabled: true,
      kick_threshold: 25
    })
    validate.mockResolvedValue(false)
    interaction.options.getInteger.mockReturnValue(25)
    await setMuteThreshold.execute(interaction)
    expect(failValidation).toHaveBeenCalledWith(interaction, 'testGuildId')
  })

  it('sets threshold when conditions pass', async () => {
    const mockSettings = {
      guild_id: 'testGuildId',
      mute_enabled: true,
      timeout_enabled: false,
      kick_enabled: false,
      mute_threshold: 5,
      save: jest.fn()
    }
    ServerSettings.findOne.mockResolvedValue(mockSettings)
    validate.mockResolvedValue(false)
    interaction.options.getInteger.mockReturnValue(12)
    await setMuteThreshold.execute(interaction)
    expect(mockSettings.save).toHaveBeenCalled()
    expect(mockSettings.mute_threshold).toBe(12)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Mute threshold set to **12**.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith(
      'Mute threshold set to 12 for guild testGuildId by Tester#1234'
    )
  })

  it('replies with error if an exception is thrown', async () => {
    ServerSettings.findOne.mockRejectedValue(new Error('DB error'))
    await setMuteThreshold.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'An error occurred while setting the mute threshold. Please try again later.',
      flags: 64
    })
  })
})
