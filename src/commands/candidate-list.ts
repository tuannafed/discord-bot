import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { CandidateService } from '../services/candidate.service.js';
import { formatPrice, formatMarketCap, formatChange } from '../utils/format.js';
import { CandidateStatus } from '../types/candidate.js';

let candidateService: CandidateService;

export function init(service: CandidateService): void {
  candidateService = service;
}

const STATUS_EMOJI: Record<CandidateStatus, string> = {
  tracking: 'Tracking',
  hit_target: 'Hit Target',
  expired: 'Expired',
};

export const data = new SlashCommandBuilder()
  .setName('candidate-list')
  .setDescription('List tracked coin candidates')
  .addStringOption((opt) =>
    opt
      .setName('status')
      .setDescription('Filter by status (default: tracking)')
      .addChoices(
        { name: 'Tracking', value: 'tracking' },
        { name: 'Hit Target', value: 'hit_target' },
        { name: 'Expired', value: 'expired' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const statusFilter = (interaction.options.getString('status') ?? 'tracking') as CandidateStatus;
  const all = await candidateService.getCandidates(guildId);
  const candidates = all.filter((c) => c.status === statusFilter);

  if (candidates.length === 0) {
    await interaction.reply(`No candidates with status **${STATUS_EMOJI[statusFilter]}**.`);
    return;
  }

  const lines = candidates.slice(0, 20).map((c) => {
    return (
      `**${c.name}** (${c.symbol.toUpperCase()}) — ${STATUS_EMOJI[c.status]}\n` +
      `Price: ${formatPrice(c.currentPrice)} | MCap: ${formatMarketCap(c.currentMarketCap)} | Target: ${formatMarketCap(c.targetMarketCap)}\n` +
      `Discovered: ${formatChange(c.discoveredChange24h)} 24h at ${formatMarketCap(c.discoveredMarketCap)}\n` +
      `ID: \`${c.id}\``
    );
  });

  const embed = new EmbedBuilder()
    .setTitle(`Candidates — ${STATUS_EMOJI[statusFilter]}`)
    .setDescription(lines.join('\n\n'))
    .setColor(0x9b59b6)
    .setFooter({ text: candidates.length > 20 ? `Showing 20 of ${candidates.length}` : `${candidates.length} candidates` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
