const dotenv = require('dotenv')
jest.mock('dotenv', () => ({
  config: jest.fn()
}))

const { getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice')
const { doForceLeave } = require('../../../src/commands/leave')
const { writeLog } = require('../../../src/utils/logger')
const { startMonitoring } = require('../../../src/audio/voice-monitor')
const joinCommand = require('../../../src/commands/join')
const mockDB = require('../../mocks/mock-db')
const { ServerSettings } = require('../../mocks/mock-db')

jest.mock('@discordjs/voice', () => ({
  getVoiceConnection: jest.fn(),
  joinVoiceChannel: jest.fn()
}))

jest.mock('../../../src/commands/leave', () => ({
  doForceLeave: jest.fn()
}))

jest.mock('../../../src/utils/logger', () => ({
  writeLog: jest.fn()
}))

jest.mock('../../../src/audio/voice-monitor', () => ({
  startMonitoring: jest.fn()
}))

jest.mock('../../../src/database/init-db', () => require('../../mocks/mock-db'))

describe('join command', () => {
  let mockInteraction

  beforeEach(() => {
    dotenv.config.mockImplementation(() => {
      process.env.DEVELOPER_MODE = 'false'
    })
    mockInteraction = {
      guild: { id: 'guildId', members: { fetch: jest.fn() } },
      user: { id: 'userId' },
      client: {},
      reply: jest.fn()
    }
    getVoiceConnection.mockReset()
    joinVoiceChannel.mockReset()
    doForceLeave.mockReset()
    startMonitoring.mockReset()
    writeLog.mockReset()
    ServerSettings.findOne.mockClear()
    ServerSettings.create.mockClear()
    mockDB.__testServerSettingsData.length = 0
    mockDB.__testViolationData.length = 0
  })

  describe('execute', () => {
    it('creates new server settings if none exist', async () => {
      ServerSettings.findOne.mockResolvedValueOnce(null)
      mockInteraction.guild.members.fetch.mockResolvedValueOnce({
        voice: {
          channel: {
            id: 'chanId',
            guild: { id: 'guildId', voiceAdapterCreator: {} },
            name: 'Channel'
          }
        }
      })
      joinVoiceChannel.mockReturnValueOnce({})
      await joinCommand.execute(mockInteraction)
      expect(ServerSettings.findOne).toHaveBeenCalledWith({ where: { guild_id: 'guildId' } })
      expect(ServerSettings.create).toHaveBeenCalledWith({ guild_id: 'guildId' })
      expect(mockDB.__testServerSettingsData).toHaveLength(1)
      expect(mockDB.__testServerSettingsData[0].guild_id).toBe('guildId')
    })

    it('does not create server settings if already exists', async () => {
      ServerSettings.findOne.mockResolvedValueOnce({ guild_id: 'guildId', volume_threshold: 60 })
      mockInteraction.guild.members.fetch.mockResolvedValueOnce({
        voice: {
          channel: {
            id: 'chanId',
            guild: { id: 'guildId', voiceAdapterCreator: {} },
            name: 'Channel'
          }
        }
      })
      joinVoiceChannel.mockReturnValueOnce({})
      await joinCommand.execute(mockInteraction)
      expect(ServerSettings.create).not.toHaveBeenCalled()
    })

    it('calls doForceLeave if an existing connection is found', async () => {
      getVoiceConnection.mockReturnValueOnce({})
      ServerSettings.findOne.mockResolvedValueOnce({ guild_id: 'guildId', volume_threshold: 50 })
      mockInteraction.guild.members.fetch.mockResolvedValueOnce({
        voice: {
          channel: {
            id: 'chanId',
            guild: { id: 'guildId', voiceAdapterCreator: {} },
            name: 'Channel'
          }
        }
      })
      joinVoiceChannel.mockReturnValueOnce({})
      await joinCommand.execute(mockInteraction)
      expect(doForceLeave).toHaveBeenCalledWith('guildId')
    })

    it('replies ephemeral if user not in voice channel', async () => {
      ServerSettings.findOne.mockResolvedValueOnce({ guild_id: 'guildId', volume_threshold: 50 })
      mockInteraction.guild.members.fetch.mockResolvedValueOnce({
        voice: { channel: null }
      })
      await joinCommand.execute(mockInteraction)
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Please join a voice channel first.',
        flags: 64
      })
    })

    it('joins and starts monitoring with correct threshold', async () => {
      ServerSettings.findOne.mockResolvedValueOnce({ guild_id: 'guildId', volume_threshold: 40 })
      mockInteraction.guild.members.fetch.mockResolvedValueOnce({
        voice: {
          channel: {
            id: 'chanId',
            guild: { id: 'guildId', voiceAdapterCreator: {} },
            name: 'Channel'
          }
        }
      })
      joinVoiceChannel.mockReturnValueOnce({})
      await joinCommand.execute(mockInteraction)
      expect(joinVoiceChannel).toHaveBeenCalled()
      expect(startMonitoring).toHaveBeenCalledWith(
        mockInteraction.client,
        {},
        { id: 'chanId', guild: { id: 'guildId', voiceAdapterCreator: {} }, name: 'Channel' },
        2500 + (40 * 100)
      )
    })

    it('handles errors', async () => {
      ServerSettings.findOne.mockRejectedValueOnce(new Error('fail'))
      await joinCommand.execute(mockInteraction)
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Failed to join the voice channel.',
        flags: 64
      })
    })
  })

  describe('doJoin', () => {
    it('replies if user not in voice channel', async () => {
      mockInteraction.guild.members.fetch.mockResolvedValueOnce({
        voice: { channel: null }
      })
      await joinCommand.doJoin(mockInteraction, { volume_threshold: 50 })
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Please join a voice channel first.',
        flags: 64
      })
      expect(joinVoiceChannel).not.toHaveBeenCalled()
    })

    it('joins the channel and starts monitoring', async () => {
      mockInteraction.guild.members.fetch.mockResolvedValueOnce({
        voice: {
          channel: {
            id: 'chanId',
            guild: { id: 'guildId', voiceAdapterCreator: {} },
            name: 'Channel'
          }
        }
      })
      joinVoiceChannel.mockReturnValueOnce({})
      await joinCommand.doJoin(mockInteraction, { volume_threshold: 40 })
      expect(joinVoiceChannel).toHaveBeenCalled()
      expect(startMonitoring).toHaveBeenCalled()
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Joined the voice channel.',
        flags: 64
      })
    })

    it('handles errors thrown during join', async () => {
      mockInteraction.guild.members.fetch.mockImplementation(() => {
        throw new Error('fetch fail')
      })
      await joinCommand.doJoin(mockInteraction, { volume_threshold: 60 })
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Failed to join the voice channel.',
        flags: 64
      })
      expect(writeLog).toHaveBeenCalledWith(expect.stringContaining('Error joining voice channel: Error: fetch fail'))
    })
  })
})
