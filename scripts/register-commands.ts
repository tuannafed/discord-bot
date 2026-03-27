import '../src/config/env.js';
import { REST, Routes } from 'discord.js';
import { env } from '../src/config/env.js';
import { getCommandBuilders } from '../src/commands/index.js';
import { logger } from '../src/utils/logger.js';

function parseGuildIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function registerCommands(): Promise<void> {
  const commands = getCommandBuilders().map((cmd) => cmd.toJSON() as unknown as Record<string, unknown>);
  const rest = new REST().setToken(env.DISCORD_TOKEN);

  const guildIds = parseGuildIds(env.DISCORD_GUILD_ID);
  if (guildIds.length > 0) {
    // Guild-scoped (instant, for development) — comma-separated DISCORD_GUILD_ID
    for (const guildId of guildIds) {
      logger.info(`Registering ${commands.length} commands to guild ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId), { body: commands });
    }
    logger.info(`Guild commands registered for ${guildIds.length} guild(s).`);
  } else {
    // Global (takes up to 1 hour to propagate)
    logger.info(`Registering ${commands.length} commands globally...`);
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commands });
    logger.info('Global commands registered.');
  }
}

registerCommands().catch((err) => {
  logger.error('Failed to register commands', err);
  process.exit(1);
});
