require("dotenv").config()
const fs = require("fs")
const path = require("path")
const { Client, Collection, GatewayIntentBits, Routes, MessageFlags } = require("discord.js")
const { REST } = require("@discordjs/rest")
const { writeLog } = require("./utils/logger")

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})

client.commands = new Collection()
const commands = []
const commandsPath = path.join(__dirname, "commands")
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"))

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file))
  client.commands.set(command.data.name, command)
  commands.push(command.data.toJSON())
}

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN)

client.once("ready", async () => {
  writeLog("Bot is online")
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id, process.env.TEST_GUILD_ID),
      { body: commands }
    )
  } catch (error) {
    writeLog(`Error registering slash commands: ${error}`)
  }
})

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  const command = client.commands.get(interaction.commandName)
  if (!command) return
  try {
    await command.execute(interaction)
  } catch (error) {
    writeLog(`Error in command execution: ${error}`)
    await interaction.reply({
      content: "There was an error while executing this command!",
      flags: MessageFlags.Ephemeral,
    })
  }
})

client.login(process.env.BOT_TOKEN)
