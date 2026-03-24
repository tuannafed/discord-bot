import '../src/config/env.js';
import { REST, Routes } from 'discord.js';
import { env } from '../src/config/env.js';
import { getCommandBuilders } from '../src/commands/index.js';
import { logger } from '../src/utils/logger.js';

async function registerCommands(): Promise<void> {
  const commands = getCommandBuilders().map((cmd) => cmd.toJSON() as Record<string, unknown>);
  const rest = new REST().setToken(env.DISCORD_TOKEN);

  if (env.DISCORD_GUILD_ID) {
    // Guild-scoped (instant, for development)
    logger.info(`Registering ${commands.length} commands to guild ${env.DISCORD_GUILD_ID}...`);
    await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
      { body: commands }
    );
    logger.info('Guild commands registered.');
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
