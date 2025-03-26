const { Violation } = require('../../../src/database/init-db')
const { writeLog } = require('../../../src/utils/logger')
const toggleUserExempt = require('../../../src/commands/toggle-user-exempt')

jest.mock('../../../src/database/init-db', () => ({
  Violation: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

describe('toggleuserexempt', () => {
  let interaction

  beforeEach(() => {
    interaction = {
      guildId: 'testGuildId',
      options: {
        getUser: jest.fn(),
        getBoolean: jest.fn()
      },
      reply: jest.fn()
    }
    Violation.findOne.mockReset()
    Violation.create.mockReset()
    writeLog.mockReset()
  })

  it('creates new violation record if none exists and no exempt is provided', async () => {
    Violation.findOne.mockResolvedValueOnce(null)
    Violation.create.mockResolvedValueOnce({ exempt: false })
    interaction.options.getUser.mockReturnValue({ id: 'userId', tag: 'TestUser#1234' })
    interaction.options.getBoolean.mockReturnValue(null)
    await toggleUserExempt.execute(interaction)
    expect(Violation.create).toHaveBeenCalledWith({
      guild_id: 'testGuildId',
      user_id: 'userId',
      exempt: false
    })
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'User **TestUser#1234** is not exempt from moderation punishments.\nUsage: /toggleuserexempt user:@username exempt:<true|false>',
      flags: 64
    })
  })

  it('updates existing violation record if exempt is provided', async () => {
    const mockSave = jest.fn()
    Violation.findOne.mockResolvedValueOnce({
      exempt: false,
      save: mockSave
    })
    interaction.options.getUser.mockReturnValue({ id: 'userId', tag: 'TestUser#1234' })
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleUserExempt.execute(interaction)
    expect(mockSave).toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'User **TestUser#1234** is exempt from moderation punishments.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith('User exemption set to true for TestUser#1234 in guild testGuildId')
  })

  it('handles existing record if no exempt is provided', async () => {
    Violation.findOne.mockResolvedValueOnce({ exempt: true })
    interaction.options.getUser.mockReturnValue({ id: 'userId', tag: 'TestUser#1234' })
    interaction.options.getBoolean.mockReturnValue(null)
    await toggleUserExempt.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'User **TestUser#1234** is exempt from moderation punishments.\nUsage: /toggleuserexempt user:@username exempt:<true|false>',
      flags: 64
    })
  })

  it('handles errors', async () => {
    Violation.findOne.mockRejectedValueOnce(new Error('fail'))
    interaction.options.getUser.mockReturnValue({ id: 'userId', tag: 'TestUser#1234' })
    interaction.options.getBoolean.mockReturnValue(true)
    await toggleUserExempt.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'An error occurred while processing the exemption status. Please try again later.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith('Failed to update/check exemption for user TestUser#1234 in guild testGuildId: Error: fail')
  })
})
