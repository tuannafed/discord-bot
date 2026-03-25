import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { AlertService } from '../services/alert.service.js';

let alertService: AlertService;

export function init(service: AlertService): void {
  alertService = service;
}

export const data = new SlashCommandBuilder()
  .setName('alert-remove')
  .setDescription('Remove an alert by ID')
  .addStringOption((opt) =>
    opt.setName('id').setDescription('Alert ID (from /alert-list)').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const id = interaction.options.getString('id', true).trim();

  const removed = await alertService.removeAlert(id, guildId);

  if (!removed) {
    await interaction.reply({
      content: `Alert \`${id}\` not found or does not belong to this server.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({ content: `Alert \`${id}\` removed.`, ephemeral: true });
}
