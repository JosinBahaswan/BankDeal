const fs = require('fs');
const { spawnSync } = require('child_process');

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split(/\r?\n/);

for (let line of lines) {
  line = line.trim();
  if (!line || line.startsWith('#')) continue;

  const firstEq = line.indexOf('=');
  if (firstEq === -1) continue;

  const key = line.substring(0, firstEq).trim();
  const value = line.substring(firstEq + 1).trim();

  if (!key || !value) continue;

  console.log(`Setting ${key}...`);
  // Use spawnSync with input via stdin to avoid shell escaping / newline issues
  const result = spawnSync(
    'npx',
    ['-y', 'vercel', 'env', 'add', key, 'production', '--force'],
    {
      input: value + '\n',   // vercel CLI reads the value from stdin
      encoding: 'utf8',
      shell: true,
    }
  );

  if (result.stderr && result.stderr.includes('Error')) {
    console.error(`  ✗ ${key}: ${result.stderr.trim()}`);
  } else {
    console.log(`  ✓ ${key} done`);
  }
}

console.log('\nAll env variables processed.');
