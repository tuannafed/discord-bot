import { CryptoDataProvider } from '../providers/crypto-data.provider.js';

let symbolMap: Map<string, string> | null = null;

export async function resolveSymbolToId(
  symbol: string,
  provider: CryptoDataProvider
): Promise<string | null> {
  if (!symbolMap) {
    const coinList = await provider.getCoinList();
    symbolMap = new Map(coinList.map((coin) => [coin.symbol.toLowerCase(), coin.id]));
  }
  return symbolMap.get(symbol.toLowerCase()) ?? null;
}

export function clearSymbolCache(): void {
  symbolMap = null;
}
