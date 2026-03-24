import { Client, Events, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../commands/index.js';
import { logger } from '../utils/logger.js';

export function registerInteractionCreateEvent(
  client: Client,
  commands: Map<string, Command>
): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      await interaction.reply({ content: 'Unknown command.', ephemeral: true });
      return;
    }

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}`, error);

      const errorMessage = 'An error occurred while executing this command.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage).catch(() => undefined);
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => undefined);
      }
    }
  });
}
