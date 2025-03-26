const { validate, failValidation } = require('../../../src/database/punishment-validator')
const { writeLog } = require('../../../src/utils/logger')
const { MessageFlags } = require('discord.js')
const {
  DEFAULT_MUTE_THRESHOLD,
  DEFAULT_TIMEOUT_THRESHOLD,
  DEFAULT_KICK_THRESHOLD
} = require('../../../src/utils/constants')

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

describe('punishment-validator', () => {
  let mockServerSettings

  beforeEach(() => {
    mockServerSettings = {
      mute_enabled: false,
      timeout_enabled: false,
      kick_enabled: false,
      mute_threshold: 1000,
      timeout_threshold: 2000,
      kick_threshold: 3000,
      save: jest.fn()
    }
    writeLog.mockReset()
  })

  it('returns false if no violation', async () => {
    mockServerSettings.mute_enabled = true
    mockServerSettings.timeout_enabled = true
    mockServerSettings.kick_enabled = true
    mockServerSettings.mute_threshold = 1000
    mockServerSettings.timeout_threshold = 2000
    mockServerSettings.kick_threshold = 3000
    const result = await validate(mockServerSettings)
    expect(result).toBe(false)
    expect(mockServerSettings.save).not.toHaveBeenCalled()
  })

  it('violates if mute_threshold >= timeout_threshold when both enabled', async () => {
    mockServerSettings.mute_enabled = true
    mockServerSettings.timeout_enabled = true
    mockServerSettings.mute_threshold = 2000
    mockServerSettings.timeout_threshold = 2000
    const result = await validate(mockServerSettings)
    expect(result).toBe(true)
    expect(mockServerSettings.mute_threshold).toBe(DEFAULT_MUTE_THRESHOLD)
    expect(mockServerSettings.timeout_threshold).toBe(DEFAULT_TIMEOUT_THRESHOLD)
    expect(mockServerSettings.kick_threshold).toBe(DEFAULT_KICK_THRESHOLD)
    expect(mockServerSettings.save).toHaveBeenCalled()
  })

  it('violates if mute_threshold >= kick_threshold when both enabled', async () => {
    mockServerSettings.mute_enabled = true
    mockServerSettings.kick_enabled = true
    mockServerSettings.mute_threshold = 5000
    mockServerSettings.kick_threshold = 4000
    const result = await validate(mockServerSettings)
    expect(result).toBe(true)
    expect(mockServerSettings.mute_threshold).toBe(DEFAULT_MUTE_THRESHOLD)
    expect(mockServerSettings.timeout_threshold).toBe(DEFAULT_TIMEOUT_THRESHOLD)
    expect(mockServerSettings.kick_threshold).toBe(DEFAULT_KICK_THRESHOLD)
    expect(mockServerSettings.save).toHaveBeenCalled()
  })

  it('violates if timeout_threshold >= kick_threshold when both enabled', async () => {
    mockServerSettings.timeout_enabled = true
    mockServerSettings.kick_enabled = true
    mockServerSettings.timeout_threshold = 5000
    mockServerSettings.kick_threshold = 5000
    const result = await validate(mockServerSettings)
    expect(result).toBe(true)
    expect(mockServerSettings.mute_threshold).toBe(DEFAULT_MUTE_THRESHOLD)
    expect(mockServerSettings.timeout_threshold).toBe(DEFAULT_TIMEOUT_THRESHOLD)
    expect(mockServerSettings.kick_threshold).toBe(DEFAULT_KICK_THRESHOLD)
    expect(mockServerSettings.save).toHaveBeenCalled()
  })

  it('does not violate if only one punishment is enabled', async () => {
    mockServerSettings.mute_enabled = true
    mockServerSettings.timeout_enabled = false
    mockServerSettings.kick_enabled = false
    mockServerSettings.mute_threshold = 3000
    const result = await validate(mockServerSettings)
    expect(result).toBe(false)
    expect(mockServerSettings.save).not.toHaveBeenCalled()
  })

  it('failValidation calls reply and logs', () => {
    const mockInteraction = {
      reply: jest.fn()
    }
    const guildId = 'testGuild'
    failValidation(mockInteraction, guildId)
    expect(writeLog).toHaveBeenCalledWith('Threshold validation failed for guild testGuild. No changes made.')
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content:
        'Failed to set threshold. The following conditions must all hold for enabled punishments:\n' +
        '1) If both MUTE and TIMEOUT are enabled, then MUTE_THRESHOLD < TIMEOUT_THRESHOLD.\n' +
        '2) If both MUTE and KICK are enabled, then MUTE_THRESHOLD < KICK_THRESHOLD.\n' +
        '3) If both TIMEOUT and KICK are enabled, then TIMEOUT_THRESHOLD < KICK_THRESHOLD.',
      flags: MessageFlags.Ephemeral
    })
  })
})
