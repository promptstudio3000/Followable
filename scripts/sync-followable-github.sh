#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/followable-github"

echo "Syncing clean tree → $DEST"

mkdir -p "$DEST"

rsync -a --delete \
  --exclude 'followable-github' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'out' \
  --exclude '.git' \
  --exclude '.cursor' \
  --exclude '.codex' \
  --exclude '.playwright-cli' \
  --exclude 'coverage' \
  --exclude '.cache' \
  --exclude 'output' \
  --exclude '.DS_Store' \
  --exclude '*.tsbuildinfo' \
  --exclude 'next-env.d.ts' \
  --exclude '.vercel' \
  --exclude '.pnpm-store' \
  --exclude 'npm-debug.log*' \
  --exclude 'yarn-error.log*' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.development.local' \
  --exclude '.env.production.local' \
  --exclude '.env.test.local' \
  "$ROOT/" "$DEST/"

cp "$ROOT/scripts/followable-github.env.example" "$DEST/.env.example"

# Odstranit případné zbylé lokální env / tajemství (rsync --delete je neřeší)
find "$DEST" -maxdepth 1 \( -name '.env' -o -name '.env.*.local' -o -name '.env.local' \) ! -name '.env.example' -type f -delete 2>/dev/null || true

# Vyčistit adresáře, které rsync při --delete nemusí smazat, když už nejsou ve zdroji
rm -rf "$DEST/output" "$DEST/.cache"

echo "Done. Další kroky v $DEST:"
echo "  npm install"
echo "  cp .env.example .env.local"
echo "  # volitelně: npm run docker:setup"
echo "  npm run dev"
echo ""
echo "Nový Git repozitář: cd $DEST && git init && git add . && git commit -m \"Initial\""
