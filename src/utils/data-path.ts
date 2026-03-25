import path from 'path';

/**
 * Resolves the path for a data file.
 * Uses DATA_DIR env var when set (e.g. Railway Volume mount at /data),
 * otherwise falls back to src/data/ inside the project.
 */
export function dataPath(filename: string): string {
  const dir = process.env.DATA_DIR ?? path.resolve(process.cwd(), 'src/data');
  return path.join(dir, filename);
}
