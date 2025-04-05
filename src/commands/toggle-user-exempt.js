const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js')
const { Violation } = require('../database/init-db')
const { writeLog } = require('../utils/logger')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toggleuserexempt')
    .setDescription('Enable or disable moderation punishment exemption for a specified user.')
    // Requires Manage Guild permission for the user invoking the command.
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check or update exemption for.')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('exempt')
        .setDescription('True to exempt user, false to disable.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId
    const targetUser = interaction.options.getUser('user')
    const providedExempt = interaction.options.getBoolean('exempt')

    try {
      let violationRecord = await Violation.findOne({
        where: {
          guild_id: guildId,
          user_id: targetUser.id
        }
      })

      if (!violationRecord) {
        violationRecord = await Violation.create({
          guild_id: guildId,
          user_id: targetUser.id,
          exempt: false
        })
      }

      if (providedExempt !== null) {
        violationRecord.exempt = providedExempt
        await violationRecord.save()

        await interaction.reply({
          content: `User **${targetUser.tag}** is ${violationRecord.exempt ? 'exempt' : 'not exempt'} from moderation punishments.`,
          flags: MessageFlags.Ephemeral
        })

        writeLog(`User exemption set to ${violationRecord.exempt} for ${targetUser.tag} in guild ${guildId}`)
      } else {
        // If no flag is provided, show current threshold and usage.
        await interaction.reply({
          content: `User **${targetUser.tag}** is ${violationRecord.exempt ? 'exempt' : 'not exempt'} from moderation punishments.\n` +
          'Usage: /toggleuserexempt user:@username exempt:<true|false>',
          flags: MessageFlags.Ephemeral
        })
      }
    } catch (error) {
      writeLog(`Failed to update/check exemption for user ${targetUser.tag} in guild ${guildId}: ${error}`)
      await interaction.reply({
        content: 'An error occurred while processing the exemption status. Please try again later.',
        flags: MessageFlags.Ephemeral
      })
    }
  }
}
