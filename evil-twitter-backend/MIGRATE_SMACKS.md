# Smacks Migration Guide

This migration adds the `smacks` field to all existing tweets in the database.

## Running the Migration

1. Make sure your `.env` file has the correct `MONGODB_URI` and `MONGO_DB_NAME` set.

2. Run the migration script:

```bash
cargo run --bin migrate_smacks
```

## What it does

- Finds all tweets that don't have `metrics.smacks` field
- Sets `metrics.smacks: 0` for all existing tweets
- Also ensures tweets without a `metrics` object get a full metrics object with all fields

## After Migration

- All existing tweets will have `smacks: 0` in their metrics
- New tweets will automatically have `smacks: 0` from the default implementation
- The frontend will properly display smacks count (defaulting to 0 if missing)

## Notes

- This migration is safe to run multiple times
- It only updates tweets that don't have the smacks field
- No data will be lost
