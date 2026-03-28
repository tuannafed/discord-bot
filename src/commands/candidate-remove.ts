import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags} from 'discord.js';
import { CandidateService } from '../services/candidate.service.js';

let candidateService: CandidateService;

export function init(service: CandidateService): void {
  candidateService = service;
}

export const data = new SlashCommandBuilder()
  .setName('candidate-remove')
  .setDescription('Xóa một coin khỏi danh sách tiềm năng')
  .addStringOption((opt) =>
    opt.setName('id').setDescription('Mã ID (từ danh sách tiềm năng)').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const id = interaction.options.getString('id', true).trim();
  const removed = await candidateService.removeCandidate(id, guildId);

  if (removed) {
    await interaction.reply({ content: `Candidate \`${id}\` removed.`, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({
      content: `Candidate \`${id}\` not found or does not belong to this server.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
