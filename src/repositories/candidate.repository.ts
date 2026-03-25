import { JsonDb } from './json-db.js';
import { Candidate, CandidateDb, CandidateStatus } from '../types/candidate.js';
import { dataPath } from '../utils/data-path.js';

const DB_PATH = dataPath('candidates.json');
const DEFAULT_DATA: CandidateDb = { candidates: [] };

export class CandidateRepository {
  private readonly db: JsonDb<CandidateDb>;

  constructor() {
    this.db = new JsonDb<CandidateDb>(DB_PATH, DEFAULT_DATA);
  }

  findAll(): Candidate[] {
    return this.db.read().candidates;
  }

  findByGuild(guildId: string): Candidate[] {
    return this.db.read().candidates.filter((c) => c.guildId === guildId);
  }

  findByStatus(status: CandidateStatus): Candidate[] {
    return this.db.read().candidates.filter((c) => c.status === status);
  }

  findByCoinId(coinId: string): Candidate | undefined {
    return this.db.read().candidates.find(
      (c) => c.coinId === coinId && c.status === 'tracking'
    );
  }

  add(candidate: Candidate): void {
    const data = this.db.read();
    this.db.write({ candidates: [...data.candidates, candidate] });
  }

  update(updated: Candidate): void {
    const data = this.db.read();
    const candidates = data.candidates.map((c) => (c.id === updated.id ? updated : c));
    this.db.write({ candidates });
  }

  remove(id: string): boolean {
    const data = this.db.read();
    const filtered = data.candidates.filter((c) => c.id !== id);
    if (filtered.length === data.candidates.length) return false;
    this.db.write({ candidates: filtered });
    return true;
  }
}
