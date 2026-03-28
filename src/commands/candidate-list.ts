import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags} from 'discord.js';
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
  .setDescription('Danh sách coin tiềm năng đang theo dõi')
  .addStringOption((opt) =>
    opt
      .setName('status')
      .setDescription('Lọc trạng thái (mặc định: đang theo)')
      .addChoices(
        { name: 'Đang theo', value: 'tracking' },
        { name: 'Đạt mục tiêu', value: 'hit_target' },
        { name: 'Hết hạn', value: 'expired' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', flags: MessageFlags.Ephemeral });
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
    const arrow = c.discoveredChange24h >= 0 ? '▲' : '▼';
    return (
      `**${c.symbol.toUpperCase()}** ${STATUS_EMOJI[c.status]}\n` +
      `\`${formatPrice(c.currentPrice).padEnd(10)} ${formatMarketCap(c.currentMarketCap).padEnd(7)} → ${formatMarketCap(c.targetMarketCap)}\`\n` +
      `Disc: ${arrow}${formatChange(c.discoveredChange24h)} at ${formatMarketCap(c.discoveredMarketCap)} · ID: \`${c.id}\``
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
