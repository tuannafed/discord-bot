import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check bot latency');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const latency = Date.now() - interaction.createdTimestamp;
  await interaction.reply(`Pong! Latency: **${latency}ms** | API: **${interaction.client.ws.ping}ms**`);
}
