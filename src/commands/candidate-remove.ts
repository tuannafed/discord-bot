import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { CandidateService } from '../services/candidate.service.js';

let candidateService: CandidateService;

export function init(service: CandidateService): void {
  candidateService = service;
}

export const data = new SlashCommandBuilder()
  .setName('candidate-remove')
  .setDescription('Remove a candidate by ID')
  .addStringOption((opt) =>
    opt.setName('id').setDescription('Candidate ID').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const id = interaction.options.getString('id', true).trim();
  const removed = await candidateService.removeCandidate(id, guildId);

  if (removed) {
    await interaction.reply({ content: `Candidate \`${id}\` removed.`, ephemeral: true });
  } else {
    await interaction.reply({
      content: `Candidate \`${id}\` not found or does not belong to this server.`,
      ephemeral: true,
    });
  }
}
