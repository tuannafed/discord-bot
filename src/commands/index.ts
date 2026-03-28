import { ChatInputCommandInteraction, AutocompleteInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, Client } from 'discord.js';
import { MarketService } from '../services/market.service.js';
import { WatchlistService } from '../services/watchlist.service.js';
import { AlertService } from '../services/alert.service.js';
import { CandidateService } from '../services/candidate.service.js';
import { CryptoDataProvider } from '../providers/crypto-data.provider.js';
import { CoinGeckoProvider } from '../providers/coingecko.provider.js';
import { CallService } from '../services/call.service.js';

import * as ping from './ping.js';
import * as coin from './coin.js';
import * as top from './top.js';
import * as watchAdd from './watch-add.js';
import * as watchRemove from './watch-remove.js';
import * as watchList from './watch-list.js';
import * as alertAdd from './alert-add.js';
import * as alertList from './alert-list.js';
import * as alertRemove from './alert-remove.js';
import * as candidateList from './candidate-list.js';
import * as candidateRemove from './candidate-remove.js';
import * as movers from './movers.js';
import * as scan from './scan.js';
import * as unlock from './unlock.js';
import * as help from './help.js';
import * as helpFull from './help-full.js';
import * as call from './call.js';
import * as follow from './follow.js';
import * as positions from './positions.js';
import * as positionsHistory from './positions-history.js';
import * as positionsClean from './positions-clean.js';
import * as tp from './tp.js';
import * as cl from './cl.js';
import * as sl from './sl.js';
import * as callDelete from './call-delete.js';
import * as callUpdate from './call-update.js';
import * as followUpdate from './follow-update.js';
import * as milestoneMute from './milestone-mute.js';
import * as milestoneUnmute from './milestone-unmute.js';
import * as positionFix from './position-fix.js';
import * as market from './market.js';
import * as funding from './funding.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export function buildCommands(
  marketService: MarketService,
  watchlistService: WatchlistService,
  alertService: AlertService,
  candidateService: CandidateService,
  provider: CryptoDataProvider,
  coinGeckoProvider: CoinGeckoProvider,
  callService: CallService,
  client: Client,
  adminUserIds: Set<string>,
): Map<string, Command> {
  coin.init(marketService);
  top.init(marketService);
  watchAdd.init(watchlistService);
  watchRemove.init(watchlistService);
  watchList.init(watchlistService, provider);
  alertAdd.init(alertService);
  alertList.init(alertService);
  alertRemove.init(alertService);
  candidateList.init(candidateService);
  candidateRemove.init(candidateService);
  movers.init(marketService);
  scan.init(marketService);
  unlock.init(marketService);
  call.init(callService);
  follow.init(callService);
  positions.init(callService, marketService);
  positionsHistory.init(callService, marketService);
  positionsClean.init(callService, adminUserIds);
  tp.init(callService, client);
  cl.init(callService, client);
  sl.init(callService, client);
  callDelete.init(callService);
  callUpdate.init(callService);
  followUpdate.init(callService);
  milestoneMute.init(callService);
  milestoneUnmute.init(callService);
  positionFix.init(callService);
  market.init(coinGeckoProvider);
  funding.init(marketService);
  const commands: Command[] = [
    ping,
    coin,
    top,
    watchAdd,
    watchRemove,
    watchList,
    alertAdd,
    alertList,
    alertRemove,
    candidateList,
    candidateRemove,
    movers,
    scan,
    unlock,
    call,
    follow,
    positions,
    positionsHistory,
    positionsClean,
    tp,
    cl,
    sl,
    callDelete,
    callUpdate,
    followUpdate,
    milestoneMute,
    milestoneUnmute,
    positionFix,
    market,
    funding,
    help,
    helpFull,
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
    alertRemove.data,
    candidateList.data,
    candidateRemove.data,
    movers.data,
    scan.data,
    unlock.data,
    call.data,
    follow.data,
    positions.data,
    positionsHistory.data,
    positionsClean.data,
    tp.data,
    cl.data,
    sl.data,
    callDelete.data,
    callUpdate.data,
    followUpdate.data,
    milestoneMute.data,
    milestoneUnmute.data,
    positionFix.data,
    market.data,
    funding.data,
    help.data,
    helpFull.data,
  ];
}
