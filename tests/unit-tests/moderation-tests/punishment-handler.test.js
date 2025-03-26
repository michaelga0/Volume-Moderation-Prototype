const { applyNextPunishment, calculateWarningsUntilNext } = require('../../../src/moderation/punishment-handler')
const { executePunishment } = require('../../../src/moderation/punish')
const { MUTE_STATUS, TIMEOUT_STATUS, KICK_STATUS } = require('../../../src/utils/constants')

jest.mock('../../../src/moderation/punish', () => ({
  executePunishment: jest.fn()
}))

describe('punishment-handler', () => {
  let member, violation, serverSettings

  beforeEach(() => {
    member = {
      id: 'userId',
      guild: {
        members: {
          me: {
            permissions: { has: jest.fn() }
          }
        }
      },
      kickable: true,
      moderatable: true,
      voice: {}
    }
    violation = {
      exempt: false,
      violations_count: 0,
      punishment_status: 0
    }
    serverSettings = {
      mute_enabled: true,
      mute_threshold: 2,
      timeout_enabled: true,
      timeout_threshold: 5,
      kick_enabled: true,
      kick_threshold: 10
    }
    executePunishment.mockReset()
  })

  describe('applyNextPunishment', () => {
    it('returns immediately if exempt is true', async () => {
      violation.exempt = true
      await applyNextPunishment(member, violation, serverSettings)
      expect(executePunishment).not.toHaveBeenCalled()
    })

    it('does nothing if no punishments match threshold', async () => {
      violation.violations_count = 1
      violation.punishment_status = 0
      member.guild.members.me.permissions.has.mockReturnValue(true)
      await applyNextPunishment(member, violation, serverSettings)
      expect(executePunishment).not.toHaveBeenCalled()
    })

    it('calls executePunishment if threshold is met', async () => {
      violation.violations_count = 2
      violation.punishment_status = 0
      member.guild.members.me.permissions.has.mockReturnValue(true)
      await applyNextPunishment(member, violation, serverSettings)
      expect(executePunishment).toHaveBeenCalledWith(
        member,
        violation,
        { name: 'mute', status: MUTE_STATUS, threshold: 2 },
        serverSettings
      )
    })

    it('sorts by threshold descending and finds next punishment', async () => {
      violation.violations_count = 5
      violation.punishment_status = 0
      member.guild.members.me.permissions.has.mockReturnValue(true)
      await applyNextPunishment(member, violation, serverSettings)
      expect(executePunishment).toHaveBeenCalledWith(
        member,
        violation,
        { name: 'mute', status: MUTE_STATUS, threshold: 2 },
        serverSettings
      )
    })

    it('skips punishments not permitted by the bot', async () => {
      violation.violations_count = 10
      member.kickable = false
      member.moderatable = false
      member.guild.members.me.permissions.has.mockReturnValue(false)
      await applyNextPunishment(member, violation, serverSettings)
      expect(executePunishment).not.toHaveBeenCalled()
    })

    it('only applies punishments if punishment_status >= (status - 1)', async () => {
      violation.violations_count = 10
      violation.punishment_status = 1
      member.guild.members.me.permissions.has.mockImplementation((perm) => perm === 'MUTE_MEMBERS')
      await applyNextPunishment(member, violation, serverSettings)
      expect(executePunishment).toHaveBeenCalledWith(
        member,
        violation,
        { name: 'timeout', status: TIMEOUT_STATUS, threshold: 5 },
        serverSettings
      )
    })
  })

  describe('calculateWarningsUntilNext', () => {
    beforeEach(() => {
      member.guild.members.me.permissions.has.mockReturnValue(true)
    })

    it('returns null if exempt', () => {
      const msg = calculateWarningsUntilNext(3, 0, true, serverSettings, member)
      expect(msg).toBeNull()
    })

    it('returns null if user is already at KICK_STATUS', () => {
      const msg = calculateWarningsUntilNext(10, KICK_STATUS, false, serverSettings, member)
      expect(msg).toBeNull()
    })

    it('returns null if no next punishment found', () => {
      serverSettings.mute_enabled = false
      serverSettings.timeout_enabled = false
      serverSettings.kick_enabled = false
      const msg = calculateWarningsUntilNext(1, 0, false, serverSettings, member)
      expect(msg).toBeNull()
    })

    it('calculates warnings left for next punishment', () => {
      const msg = calculateWarningsUntilNext(1, 0, false, serverSettings, member)
      expect(msg).toBe('You have 1 more warnings until a server mute.')
    })

    it('clamps warnings to 1 if threshold already passed', () => {
      serverSettings.mute_threshold = 2
      const msg = calculateWarningsUntilNext(5, 0, false, serverSettings, member)
      expect(msg).toBe('You have 1 more warnings until a server mute.')
    })

    it('returns the next punishment beyond current status', () => {
      violation.punishment_status = MUTE_STATUS
      serverSettings.mute_threshold = 2
      serverSettings.timeout_threshold = 5
      serverSettings.kick_threshold = 10
      const msg = calculateWarningsUntilNext(4, MUTE_STATUS, false, serverSettings, member)
      expect(msg).toBe('You have 1 more warnings until a server timeout.')
    })
  })
})
