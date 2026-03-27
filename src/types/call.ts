export type CallDirection = 'long' | 'short';
export type CallStatus = 'active' | 'closed';
export type CloseType = 'tp' | 'cl';

export interface Call {
  id: string;
  guildId: string;
  channelId: string;
  symbol: string;
  direction: CallDirection;
  callPrice: number;
  calledBy: string;
  calledById: string;
  calledAt: string;
  status: CallStatus;
}

export interface Position {
  id: string;
  callId: string;
  guildId: string;
  userId: string;
  username: string;
  entryPrice: number;
  joinedAt: string;
  closedAt: string | null;
  closeType: CloseType | null;
  closePrice: number | null;
  pnlPct: number | null;
  notifiedMilestones: string; // comma-separated, e.g. "100,200"
}

export interface CallWithPositions extends Call {
  positions: Position[];
}
