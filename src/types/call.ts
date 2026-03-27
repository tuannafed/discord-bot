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
  leverage: number;
  calledBy: string;
  calledById: string;
  calledAt: string;
  status: CallStatus;
  callerClosedAt: string | null;
  callerCloseType: CloseType | null;
  callerClosePrice: number | null;
  callerPnlPct: number | null;
  callerNotifiedMilestones: string;
}

export interface Position {
  id: string;
  callId: string;
  guildId: string;
  userId: string;
  username: string;
  entryPrice: number;
  leverage: number;
  joinedAt: string;
  closedAt: string | null;
  closeType: CloseType | null;
  closePrice: number | null;
  pnlPct: number | null;
  notifiedMilestones: string;
  mutedMilestones: boolean;
}

export interface CallWithPositions extends Call {
  positions: Position[];
}
