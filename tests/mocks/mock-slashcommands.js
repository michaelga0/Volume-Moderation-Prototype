class MockSlashCommandBuilder {
  setName(name) {
    this.name = name
    return this
  }
  setDescription(desc) {
    this.description = desc
    return this
  }
}
const MockMessageFlags = {
  Ephemeral: 64
}
module.exports = {
  SlashCommandBuilder: MockSlashCommandBuilder,
  MessageFlags: MockMessageFlags
}
  