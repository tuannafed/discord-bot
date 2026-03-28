import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, MessageFlags} from 'discord.js';
import { AlertService } from '../services/alert.service.js';

let alertService: AlertService;

export function init(service: AlertService): void {
  alertService = service;
}

export const data = new SlashCommandBuilder()
  .setName('alert-remove')
  .setDescription('Xóa một cảnh báo')
  .addStringOption((opt) =>
    opt.setName('id').setDescription('Chọn cảnh báo cần xóa').setRequired(true).setAutocomplete(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) { await interaction.respond([]); return; }

  const alerts = await alertService.getAlerts(guildId);
  const choices = alerts.map((a) => ({
    name: `${a.symbol.toUpperCase()} ${a.condition} ${a.threshold} (${a.id.slice(0, 8)})`,
    value: a.id,
  }));
  await interaction.respond(choices.slice(0, 25));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const id = interaction.options.getString('id', true).trim();

  const removed = await alertService.removeAlert(id, guildId);

  if (!removed) {
    await interaction.reply({
      content: `Alert \`${id}\` not found or does not belong to this server.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({ content: `✅ Đã xoá alert \`${id.slice(0, 8)}\`.`, flags: MessageFlags.Ephemeral });
}
