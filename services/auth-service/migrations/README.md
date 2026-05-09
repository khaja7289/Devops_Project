# Database Migrations Guide

This directory contains Flyway database migration files that track all schema changes over time.

## Overview

Flyway automatically manages database schema versioning and execution. Each migration file follows a naming convention that determines execution order.

## File Naming Convention

```
V<version>__<description>.sql
```

- `V` - Indicates this is a versioned migration
- `<version>` - Version number (1, 2, 3, etc.)
- `__` - Double underscore separator
- `<description>` - Human-readable description (underscores replace spaces)

**Examples**:
- `V1__Create_users_table.sql`
- `V2__Create_refresh_tokens_table.sql`
- `V3__Insert_test_users.sql`

## Current Migrations

| Version | Description | Status |
|---------|-------------|--------|
| V1 | Create users table | ✅ Executed |
| V2 | Create refresh_tokens table | ✅ Executed |
| V3 | Insert test users | ✅ Executed |

## How It Works

1. Flyway starts before other services
2. Connects to PostgreSQL database
3. Reads all migration files in order
4. Executes only new migrations (tracks in `flyway_schema_history` table)
5. Other services start after migrations complete

## Adding New Migrations

### Step 1: Create Migration File

Create a new SQL file following the naming convention:

```bash
touch services/auth-service/migrations/V4__Your_migration_description.sql
```

### Step 2: Write SQL

```sql
-- Add a new column
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create an index
CREATE INDEX idx_users_role ON users(role);
```

### Step 3: Deploy

```bash
# Restart services (Flyway runs automatically)
docker-compose down
docker-compose up -d --build
```

## Best Practices

### ✅ DO:
- One logical change per migration file
- Use `IF NOT EXISTS` for safety
- Include comments explaining why (not just what)
- Test migrations locally first
- Use transactions for data changes
- Create indexes separately from tables
- Use descriptive names

### ❌ DON'T:
- Mix DDL (schema) and DML (data) in one file
- Use reversible migrations (Flyway is forward-only)
- Drop tables without backups
- Change business logic in migrations
- Use Flyway for application data updates
- Make breaking changes without planning

## Example Migrations

### Add a new column
```sql
-- V4__Add_last_login_to_users.sql
ALTER TABLE users 
ADD COLUMN last_login TIMESTAMP;
```

### Create an index
```sql
-- V5__Add_index_on_users_email.sql
CREATE INDEX CONCURRENTLY idx_users_email_active 
ON users(email) WHERE role IS NOT NULL;
```

### Create a new table
```sql
-- V6__Create_audit_log_table.sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Insert reference data
```sql
-- V7__Insert_roles.sql
INSERT INTO roles (name, description) VALUES
('admin', 'Administrator with full access'),
('instructor', 'Can create and manage courses'),
('student', 'Can enroll in courses')
ON CONFLICT DO NOTHING;
```

## Checking Migration History

```bash
# Connect to database
docker exec -it postgres psql -U postgres -d udemy_devops

# View migration history
SELECT * FROM flyway_schema_history;
```

## Rollback Strategy

⚠️ Flyway doesn't support automatic rollbacks. Instead:

1. **Write a compensating migration**:
   ```sql
   -- V4__Undo_previous_change.sql
   ALTER TABLE users DROP COLUMN temporary_field;
   ```

2. **Verify before deploying**:
   ```bash
   # Test locally first
   docker-compose up -d
   # Verify results
   docker exec postgres psql -U postgres -d udemy_devops -c "SELECT * FROM users;"
   ```

3. **Backup before major changes**:
   ```bash
   docker exec postgres pg_dump -U postgres udemy_devops > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

## Common Issues

### Migration Fails

```bash
# Check logs
docker logs flyway

# View migration history
docker exec postgres psql -U postgres -d udemy_devops -c "SELECT * FROM flyway_schema_history;"
```

### Need to Fix Failed Migration

1. Fix the SQL in the migration file
2. Delete the failed migration record:
   ```sql
   DELETE FROM flyway_schema_history WHERE version = 4;
   ```
3. Restart Flyway: `docker-compose restart flyway`

### Check Flyway Status

```bash
# View what Flyway did
docker logs flyway | grep -i migration

# Verify migrations in DB
docker exec postgres psql -U postgres -d udemy_devops -c "\dt flyway_schema_history"
```

## Performance Considerations

- Use `CONCURRENTLY` for index creation in large tables
- Add migrations during low-traffic periods
- Test major migrations on a staging database first
- Consider table size before running ALTER TABLE

## References

- [Flyway Documentation](https://flywaydb.org/documentation/)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Database Migration Best Practices](https://flywaydb.org/documentation/concepts/migrations)
