let serverSettingsData = []
let violationData = []

const mockServerSettings = {
  findOne: jest.fn(async ({ where }) => {
    const { guild_id } = where
    return serverSettingsData.find(entry => entry.guild_id === guild_id) || null
  }),
  create: jest.fn(async newSettings => {
    serverSettingsData.push(newSettings)
    return newSettings
  }),
}

const mockViolation = {
  findOne: jest.fn(async ({ where }) => {
    const { user_id, guild_id } = where
    return violationData.find(
      entry => entry.user_id === user_id && entry.guild_id === guild_id
    ) || null
  }),
  create: jest.fn(async newViolation => {
    violationData.push(newViolation)
    return newViolation
  }),
}

module.exports = {
  sequelize: {
    sync: jest.fn(async () => {}),
  },
  Violation: mockViolation,
  ServerSettings: mockServerSettings,
  initDB: jest.fn(async () => {}),
  __testServerSettingsData: serverSettingsData,
  __testViolationData: violationData
}
