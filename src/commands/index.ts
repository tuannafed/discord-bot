import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { WatchlistService } from '../services/watchlist.service.js';
import { AlertService } from '../services/alert.service.js';
import { CandidateService } from '../services/candidate.service.js';
import { CryptoDataProvider } from '../providers/crypto-data.provider.js';

import * as ping from './ping.js';
import * as coin from './coin.js';
import * as top from './top.js';
import * as watchAdd from './watch-add.js';
import * as watchRemove from './watch-remove.js';
import * as watchList from './watch-list.js';
import * as alertAdd from './alert-add.js';
import * as alertList from './alert-list.js';
import * as candidateList from './candidate-list.js';
import * as candidateRemove from './candidate-remove.js';
import * as movers from './movers.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export function buildCommands(
  marketService: MarketService,
  watchlistService: WatchlistService,
  alertService: AlertService,
  candidateService: CandidateService,
  provider: CryptoDataProvider
): Map<string, Command> {
  coin.init(marketService);
  top.init(marketService);
  watchAdd.init(watchlistService);
  watchRemove.init(watchlistService);
  watchList.init(watchlistService, provider);
  alertAdd.init(alertService);
  alertList.init(alertService);
  candidateList.init(candidateService);
  candidateRemove.init(candidateService);
  movers.init(marketService);

  const commands: Command[] = [
    ping,
    coin,
    top,
    watchAdd,
    watchRemove,
    watchList,
    alertAdd,
    alertList,
    candidateList,
    candidateRemove,
    movers,
  ];

  const map = new Map<string, Command>();
  for (const cmd of commands) {
    map.set(cmd.data.name, cmd);
  }
  return map;
}

export function getCommandBuilders(): (SlashCommandBuilder | SlashCommandOptionsOnlyBuilder)[] {
  return [
    ping.data,
    coin.data,
    top.data,
    watchAdd.data,
    watchRemove.data,
    watchList.data,
    alertAdd.data,
    alertList.data,
    candidateList.data,
    candidateRemove.data,
    movers.data,
  ];
}
