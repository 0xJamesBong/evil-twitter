# 🎭 Evil Twitter - Fake Data Generation System

This document describes the institutionalized fake data generation system for Evil Twitter.

## 🚀 Quick Start

### Using the Script (Recommended)

```bash
cd /Users/hongjan/Documents/evil-twitter/evil-twitter-backend
./generate_fake_data.sh
```

### Using API Endpoints Directly

#### 1. Clear All Data

```bash
curl -X DELETE http://localhost:3000/data/clear
```

#### 2. Generate Fake Users

```bash
curl -X POST http://localhost:3000/data/users/generate \
  -H "Content-Type: application/json" \
  -d '{"count": 26, "include_follows": false}'
```

#### 3. Generate Fake Tweets

```bash
curl -X POST http://localhost:3000/data/tweets/generate \
  -H "Content-Type: application/json" \
  -d '{"tweets_per_user": 3, "include_replies": false}'
```

#### 4. Generate Complete Fake Data

```bash
curl -X POST http://localhost:3000/data/generate \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 📋 API Endpoints

### `DELETE /data/clear`

Clears all data from the database (users, tweets, follows).

**Response:**

```json
{
  "message": "All data cleared successfully",
  "users_created": 0,
  "tweets_created": 0,
  "total_users": 0,
  "total_tweets": 0
}
```

### `POST /data/users/generate`

Generates fake users for testing.

**Request Body:**

```json
{
  "count": 26, // Number of users to generate (default: 26)
  "include_follows": false // Whether to create follow relationships (default: false)
}
```

**Response:**

```json
{
  "message": "Successfully generated 26 fake users",
  "users_created": 26,
  "tweets_created": 0,
  "total_users": 26,
  "total_tweets": 0
}
```

### `POST /data/tweets/generate`

Generates fake tweets for existing users.

**Request Body:**

```json
{
  "tweets_per_user": 3, // Number of tweets per user (default: 3)
  "include_replies": false // Whether to create reply tweets (default: false)
}
```

**Response:**

```json
{
  "message": "Successfully generated 78 fake tweets",
  "users_created": 0,
  "tweets_created": 78,
  "total_users": 26,
  "total_tweets": 78
}
```

### `POST /data/generate`

Generates complete fake data (users + tweets) in one operation.

**Request Body:**

```json
{}
```

**Response:**

```json
{
  "message": "Successfully generated fake data",
  "users_created": 26,
  "tweets_created": 78,
  "total_users": 26,
  "total_tweets": 78
}
```

## 👥 Generated Users

The system generates 26 fake users with the following characteristics:

- **Names**: Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Henry, Ivy, Jack, Kate, Liam, Maya, Noah, Olivia, Paul, Quinn, Ruby, Sam, Tara, Uma, Victor, Wendy, Xavier, Yara, Zoe
- **Usernames**: alice_dev, bob_coder, charlie_tech, diana_ai, eve_data, frank_cloud, grace_web, henry_mobile, ivy_ux, jack_fullstack, kate_frontend, liam_backend, maya_devops, noah_ml, olivia_cyber, paul_blockchain, quinn_iot, ruby_api, sam_react, tara_vue, uma_angular, victor_node, wendy_python, xavier_rust, yara_go, zoe_swift
- **Emails**: {username}@example.com
- **Bio**: "Fake user {name} - Software Developer"
- **Dollar Rate**: 10,000
- **No Follow Relationships**: Users are created without any follow relationships

## 🐦 Generated Tweets

Each user gets 3 tweets with varied content:

1. **Tech Topics**: "Just discovered an amazing new framework! 🚀 #coding #tech #developer"
2. **Personal**: "Beautiful day for coding! ☀️ #programming #tech #developer"
3. **Motivational**: "Keep learning, keep growing! 🌱 #webdev #tech #developer"

## 🔧 Development Notes

### Key Features

- ✅ **Idempotent**: Running multiple times won't create duplicates
- ✅ **Configurable**: Customize user count, tweet count, etc.
- ✅ **Safe**: Won't overwrite existing data
- ✅ **Comprehensive**: Generates realistic user profiles and tweet content
- ✅ **No Follows**: Users are created without follow relationships (as requested)

### File Structure

```
src/routes/data_generation.rs  # Main data generation logic
generate_fake_data.sh          # Interactive script
FAKE_DATA_GENERATION.md        # This documentation
```

### Dependencies

- MongoDB for data storage
- Axum for HTTP endpoints
- Serde for JSON serialization
- Utoipa for OpenAPI documentation

## 🎯 Usage Examples

### Generate Fresh Data for Testing

```bash
# Clear everything
curl -X DELETE http://localhost:3000/data/clear

# Generate complete dataset
curl -X POST http://localhost:3000/data/generate
```

### Generate More Users

```bash
curl -X POST http://localhost:3000/data/users/generate \
  -H "Content-Type: application/json" \
  -d '{"count": 50, "include_follows": false}'
```

### Generate More Tweets

```bash
curl -X POST http://localhost:3000/data/tweets/generate \
  -H "Content-Type: application/json" \
  -d '{"tweets_per_user": 5, "include_replies": false}'
```

## 🚨 Important Notes

1. **No Follow Relationships**: As requested, users are created without any follow relationships
2. **Idempotent Operations**: Running the same generation multiple times won't create duplicates
3. **Database Safety**: Operations are designed to be safe and won't corrupt existing data
4. **Realistic Data**: Generated content is realistic and varied for testing purposes

## 🔍 Troubleshooting

### Common Issues

1. **Server Not Running**: Make sure the backend server is running on port 3000
2. **Database Connection**: Ensure MongoDB is running and accessible
3. **Duplicate Users**: The system checks for existing users and skips them

### Debugging

- Check server logs for detailed error messages
- Verify database connection in the backend logs
- Use the interactive script for easier debugging

---

**Happy Testing! 🎭**
