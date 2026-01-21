import fs from 'fs';
import path from 'path';

export function getVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}
