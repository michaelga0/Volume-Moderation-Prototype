const { ServerSettings } = require('../../../src/database/init-db')
const { writeLog } = require('../../../src/utils/logger')
const setTimeoutDuration = require('../../../src/commands/set-timeout-duration')

jest.mock('../../../src/database/init-db', () => ({
  ServerSettings: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

describe('set-timeout-duration', () => {
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
    writeLog.mockReset()
  })

  it('creates new server settings if none exist and no duration given', async () => {
    ServerSettings.findOne.mockResolvedValue(null)
    ServerSettings.create.mockResolvedValue({ timeout_duration: 5 })
    interaction.options.getInteger.mockReturnValue(null)
    await setTimeoutDuration.execute(interaction)
    expect(ServerSettings.create).toHaveBeenCalledWith({ guild_id: 'testGuildId' })
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Current timeout duration: **5 minute(s)**\nUsage: /set-timeout-duration minutes:<integer> (must be >= 1)',
      flags: 64
    })
  })

  it('shows current duration if no new duration provided', async () => {
    ServerSettings.findOne.mockResolvedValue({ timeout_duration: 10 })
    interaction.options.getInteger.mockReturnValue(null)
    await setTimeoutDuration.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Current timeout duration: **10 minute(s)**\nUsage: /set-timeout-duration minutes:<integer> (must be >= 1)',
      flags: 64
    })
  })

  it('rejects if newDuration < 1', async () => {
    ServerSettings.findOne.mockResolvedValue({ timeout_duration: 10 })
    interaction.options.getInteger.mockReturnValue(0)
    await setTimeoutDuration.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'The timeout duration must be at least 1 minute.',
      flags: 64
    })
  })

  it('sets duration if valid', async () => {
    const mockSettings = {
      guild_id: 'testGuildId',
      timeout_duration: 5,
      save: jest.fn()
    }
    ServerSettings.findOne.mockResolvedValue(mockSettings)
    interaction.options.getInteger.mockReturnValue(15)
    await setTimeoutDuration.execute(interaction)
    expect(mockSettings.save).toHaveBeenCalled()
    expect(mockSettings.timeout_duration).toBe(15)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Timeout duration set to **15 minute(s)**.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith(
      'Timeout duration set to 15 for guild testGuildId by Tester#1234'
    )
  })

  it('handles errors', async () => {
    ServerSettings.findOne.mockRejectedValue(new Error('fail'))
    await setTimeoutDuration.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'An error occurred while setting the timeout duration. Please try again later.',
      flags: 64
    })
  })
})
