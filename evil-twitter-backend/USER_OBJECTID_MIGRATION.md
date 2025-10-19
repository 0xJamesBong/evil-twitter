# User ObjectId Migration

## Problem

All users in the database were sharing the same ObjectId (`68d9b685550f1355d0f01ba4`), which violates MongoDB's requirement that `_id` fields must be unique. This was causing data integrity issues and potential conflicts.

## Solution

A migration has been created to fix this issue by:

1. **Identifying affected users**: Finding all users with the duplicate ObjectId
2. **Generating new ObjectIds**: Creating unique ObjectIds for each user
3. **Updating user records**: Replacing old documents with new ones containing unique ObjectIds
4. **Updating references**: Updating all references to the old ObjectIds in related collections (tweets, follows)

## Migration Endpoints

### API Endpoint

- **POST** `/admin/migrate-user-objectids`
- **Description**: Migrates all users with duplicate ObjectIds to have unique ObjectIds
- **Response**: Returns the number of users migrated

### Standalone Script

- **File**: `migrate_user_objectids.rs`
- **Usage**: Run as a standalone Rust script to perform the migration

## How to Run

### Option 1: API Endpoint

1. Start the backend server
2. Make a POST request to `/admin/migrate-user-objectids`
3. Check the response for migration results

### Option 2: Standalone Script

1. Navigate to the backend directory
2. Run: `cargo run --bin migrate_user_objectids`

## What Gets Updated

The migration updates references in the following collections:

### Users Collection

- Replaces old user documents with new ones containing unique ObjectIds

### Tweets Collection

- `author_id` field
- `author_snapshot.user_id` field
- `likes` array elements
- `retweets` array elements
- `quotes` array elements

### Follows Collection

- `follower_id` field
- `following_id` field

## Safety

- The migration is idempotent - running it multiple times won't cause issues
- If no users with duplicate ObjectIds are found, the migration will report success with 0 modifications
- All database operations are wrapped in proper error handling

## Verification

After running the migration, you can verify success by:

1. Checking that no users have the old duplicate ObjectId
2. Ensuring all user references in tweets and follows are valid
3. Confirming that user lookups work correctly
