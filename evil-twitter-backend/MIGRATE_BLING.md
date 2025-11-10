# BLING Migration Guide

This migration gives all existing users a starting balance of 10,000 BLING tokens.

## Running the Migration

1. Make sure your `.env` file has the correct `MONGODB_URI` and `MONGO_DB_NAME` set.

2. Run the migration script:

```bash
cargo run --bin migrate_bling
```

## What it does

- Finds all users in the database
- For each user:
  - If they don't have a BLING balance: Creates one with 10,000 BLING
  - If they have a BLING balance < 10,000: Updates it to 10,000
  - If they already have >= 10,000: Leaves it unchanged

## After Migration

- All existing users will have at least 10,000 BLING
- New users will automatically get 10,000 BLING when created (via `create_user` endpoint)
- Smacks now cost 1 BLING (changed from DOOLER)

## Notes

- This migration is safe to run multiple times
- It only updates balances that are less than 10k
- No data will be lost
- Users with more than 10k BLING will keep their existing balance
