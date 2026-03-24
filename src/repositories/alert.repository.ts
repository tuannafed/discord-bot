import path from 'path';
import { JsonDb } from './json-db.js';
import { AlertRule, AlertDb } from '../types/alert.js';

const DB_PATH = path.resolve(process.cwd(), 'src/data/alerts.json');
const DEFAULT_DATA: AlertDb = { alerts: [] };

export class AlertRepository {
  private readonly db: JsonDb<AlertDb>;

  constructor() {
    this.db = new JsonDb<AlertDb>(DB_PATH, DEFAULT_DATA);
  }

  findAll(): AlertRule[] {
    return this.db.read().alerts;
  }

  findByGuild(guildId: string): AlertRule[] {
    return this.db.read().alerts.filter((a) => a.guildId === guildId);
  }

  findById(id: string): AlertRule | undefined {
    return this.db.read().alerts.find((a) => a.id === id);
  }

  add(alert: AlertRule): void {
    const data = this.db.read();
    this.db.write({ alerts: [...data.alerts, alert] });
  }

  update(updated: AlertRule): void {
    const data = this.db.read();
    const alerts = data.alerts.map((a) => (a.id === updated.id ? updated : a));
    this.db.write({ alerts });
  }

  remove(id: string): boolean {
    const data = this.db.read();
    const filtered = data.alerts.filter((a) => a.id !== id);
    if (filtered.length === data.alerts.length) return false;
    this.db.write({ alerts: filtered });
    return true;
  }
}
