import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class JsonDb<T extends object> {
  private readonly filePath: string;
  private data: T;

  constructor(filePath: string, defaultData: T) {
    this.filePath = filePath;
    this.data = defaultData;
    this.init(defaultData);
  }

  private init(defaultData: T): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (!existsSync(this.filePath)) {
      writeFileSync(this.filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      this.data = defaultData;
    } else {
      const raw = readFileSync(this.filePath, 'utf-8');
      this.data = JSON.parse(raw) as T;
    }
  }

  read(): T {
    const raw = readFileSync(this.filePath, 'utf-8');
    this.data = JSON.parse(raw) as T;
    return this.data;
  }

  write(data: T): void {
    this.data = data;
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  get(): T {
    return this.data;
  }
}
