# PHASE 0: BACKUP & VALIDATION SCRIPT
# Run this from a machine with PostgreSQL client tools installed (or inside Docker)

# 1. Install Tools (If missing)
# brew install postgresql  # macOS
# sudo apt-get install postgresql-client # Linux

# 2. Set Env
# Use DATABASE_URL from environment or fallback to Frankfurt (eu-central-1)
# NOTE: Update this with your actual Supabase Transaction Pooler URL (Port 6543)
export DB_URL="${DATABASE_URL:-postgresql://postgres:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres}"
export BACKUP_FILE="backup_frankfurt_$(date +%Y%m%d).dump"

# 3. Create Backup
echo "Creating Backup..."
# Using docker if local pg_dump missing
if ! command -v pg_dump &> /dev/null; then
    echo "pg_dump not found, trying docker..."
    docker run --rm -v $(pwd):/backup postgres:15 pg_dump --format=custom --no-owner --no-acl --dbname="$DB_URL" --file="/backup/$BACKUP_FILE"
else
    pg_dump --format=custom --no-owner --no-acl --dbname="$DB_URL" --file="$BACKUP_FILE"
fi

# 4. Verify
echo "Verifying Backup..."
if [ -f "$BACKUP_FILE" ]; then
    echo "✅ Backup created: $BACKUP_FILE"
    ls -lh "$BACKUP_FILE"
else
    echo "❌ Backup FAILED"
    exit 1
fi
