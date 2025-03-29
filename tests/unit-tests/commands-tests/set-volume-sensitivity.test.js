const { ServerSettings } = require('../../../src/database/init-db')
const { writeLog } = require('../../../src/utils/logger')
const { getVoiceConnection } = require('@discordjs/voice')
const { doForceLeave } = require('../../../src/commands/leave')
const { doJoin } = require('../../../src/commands/join')
const setVolumeSensitivity = require('../../../src/commands/set-volume-sensitivity')

jest.mock('../../../src/database/init-db', () => ({
  ServerSettings: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

jest.mock('@discordjs/voice', () => ({
  getVoiceConnection: jest.fn()
}))

jest.mock('../../../src/commands/leave', () => ({
  doForceLeave: jest.fn()
}))

jest.mock('../../../src/commands/join', () => ({
  doJoin: jest.fn()
}))

describe('set-volume-sensitivity', () => {
  let interaction

  beforeEach(() => {
    interaction = {
      guildId: 'testGuildId',
      guild: {
        id: 'testGuildId',
        members: {
          me: {
            voice: {
              channel: { id: 'channelId', guild: { id: 'testGuildId' } }
            }
          }
        }
      },
      user: { tag: 'Tester#1234' },
      options: { getInteger: jest.fn() },
      reply: jest.fn()
    }
    ServerSettings.findOne.mockReset()
    ServerSettings.create.mockReset()
    writeLog.mockReset()
    getVoiceConnection.mockReset()
    doForceLeave.mockReset()
    doJoin.mockReset()
  })

  it('creates new server settings if none exist and shows current sensitivity if none provided', async () => {
    ServerSettings.findOne.mockResolvedValueOnce(null)
    ServerSettings.create.mockResolvedValueOnce({ volume_threshold: 50 })
    interaction.options.getInteger.mockReturnValue(null)
    await setVolumeSensitivity.execute(interaction)
    expect(ServerSettings.create).toHaveBeenCalledWith({ guild_id: 'testGuildId' })
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Current volume sensitivity is **50**.',
      flags: 64
    })
  })

  it('shows current sensitivity if record exists but no sensitivity is provided', async () => {
    ServerSettings.findOne.mockResolvedValueOnce({ volume_threshold: 75 })
    interaction.options.getInteger.mockReturnValue(null)
    await setVolumeSensitivity.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Current volume sensitivity is **75**.',
      flags: 64
    })
  })

  it('sets the sensitivity if provided', async () => {
    const mockSettings = {
      guild_id: 'testGuildId',
      volume_threshold: 50,
      save: jest.fn()
    }
    ServerSettings.findOne.mockResolvedValueOnce(mockSettings)
    interaction.options.getInteger.mockReturnValue(30)
    getVoiceConnection.mockReturnValue(null)
    await setVolumeSensitivity.execute(interaction)
    expect(mockSettings.volume_threshold).toBe(30)
    expect(mockSettings.save).toHaveBeenCalled()
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Volume sensitivity has been set to **30**.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith(
      'Set volume sensitivity for guild testGuildId by Tester#1234 to 30'
    )
  })

  it('handles errors', async () => {
    ServerSettings.findOne.mockRejectedValue(new Error('fail'))
    interaction.options.getInteger.mockReturnValue(40)
    await setVolumeSensitivity.execute(interaction)
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'An error occurred while setting volume sensitivity. Please try again later.',
      flags: 64
    })
    expect(writeLog).toHaveBeenCalledWith(
      'Failed to set volume sensitivity for guild testGuildId: Error: fail'
    )
  })

  describe('when bot is in a voice channel', () => {
    it('calls doForceLeave and doJoin if getVoiceConnection returns a connection', async () => {
      const mockSettings = {
        guild_id: 'testGuildId',
        volume_threshold: 50,
        save: jest.fn()
      }
      ServerSettings.findOne.mockResolvedValueOnce(mockSettings)
      interaction.options.getInteger.mockReturnValue(70)
      getVoiceConnection.mockReturnValueOnce({}) 
      await setVolumeSensitivity.execute(interaction)
      expect(doForceLeave).toHaveBeenCalledWith('testGuildId')
      expect(doJoin).toHaveBeenCalledWith(
        { id: 'channelId', guild: { id: 'testGuildId' } },
        interaction.client,
        mockSettings
      )
      expect(interaction.reply).toHaveBeenCalledWith({
        content: 'Volume sensitivity has been set to **70**.',
        flags: 64
      })
    })
  })
})
