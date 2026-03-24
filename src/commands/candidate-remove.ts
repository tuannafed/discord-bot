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
  const id = interaction.options.getString('id', true);
  const removed = candidateService.removeCandidate(id);

  if (removed) {
    await interaction.reply(`Candidate \`${id}\` removed.`);
  } else {
    await interaction.reply(`Candidate \`${id}\` not found.`);
  }
}
