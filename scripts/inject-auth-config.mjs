import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const authConfigPath = path.join(rootDir, 'api', '_shared', 'auth-config.ts');
const clientMetadataPath = path.join(rootDir, 'api', 'client-metadata.ts');

// auth-config.ts から設定を読み込む
const authConfigContent = fs.readFileSync(authConfigPath, 'utf8');

// 正規表現で値を抽出
const scopeMatch = authConfigContent.match(/export const OAUTH_SCOPE = (\[[\s\S]*?\]);/);
const nameMatch = authConfigContent.match(/export const CLIENT_NAME = "([\s\S]*?)";/);

if (!scopeMatch || !nameMatch) {
  console.error('Failed to extract config from auth-config.ts');
  process.exit(1);
}

const oauthScope = scopeMatch[1];
const clientName = `"${nameMatch[1]}"`;

// api/client-metadata.ts を読み込み、インポート部分を抽出した値で置換する
let metadataContent = fs.readFileSync(clientMetadataPath, 'utf8');

const updatedContent = metadataContent.replace(
  /import { OAUTH_SCOPE, CLIENT_NAME } from '.\/_shared\/auth-config';/,
  `const OAUTH_SCOPE = ${oauthScope};\nconst CLIENT_NAME = ${clientName};`
);

fs.writeFileSync(clientMetadataPath, updatedContent);

console.log('Successfully injected auth-config into client-metadata.ts');