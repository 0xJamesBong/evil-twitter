# Evil Twitter MVP Deployment Plan

## Overview

This document outlines the complete deployment strategy for Evil Twitter MVP, including backend, frontend, database, and authentication setup.

## Architecture

```
Frontend (Vercel) → Backend (Railway) → MongoDB Atlas
     ↓
Supabase (Auth)
```

---

## 1. Backend Deployment (Railway)

### Why Railway?

- **Easy Rust deployment** - Native support for Cargo
- **Environment variables** - Easy configuration
- **Automatic HTTPS** - Built-in SSL
- **Reasonable pricing** - $5/month for hobby plan
- **Good performance** - Fast cold starts

### Steps:

#### 1.1 Prepare Backend for Deployment

```bash
# 1. Create .env file for production
cd evil-twitter-backend
cp .env.example .env.production
```

#### 1.2 Create .env.production

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/evil_twitter?retryWrites=true&w=majority
MONGO_DB_NAME=evil_twitter
RUST_LOG=info
PORT=3000
```

#### 1.3 Create Railway Configuration

Create `railway.toml` in backend root:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "cargo run --release"
healthcheckPath = "/ping"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

#### 1.4 Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your repository
4. Select `evil-twitter-backend` folder
5. Set environment variables:
   - `MONGODB_URI` (from MongoDB Atlas)
   - `MONGO_DB_NAME=evil_twitter`
   - `RUST_LOG=info`
6. Deploy

#### 1.5 Get Backend URL

- Railway will provide: `https://your-app-name.railway.app`
- Test: `curl https://your-app-name.railway.app/ping`

---

## 2. MongoDB Atlas Setup

### 2.1 Create MongoDB Atlas Account

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Sign up for free account
3. Create new project: "Evil Twitter"

### 2.2 Create Database Cluster

1. **Cluster Type**: M0 Sandbox (Free)
2. **Cloud Provider**: AWS
3. **Region**: Choose closest to your users
4. **Cluster Name**: `evil-twitter-cluster`

### 2.3 Configure Database Access

1. **Database Access** → Add New Database User
   - Username: `evil-twitter-user`
   - Password: Generate secure password
   - Database User Privileges: `Read and write to any database`

### 2.4 Configure Network Access

1. **Network Access** → Add IP Address
   - Add Current IP Address (for development)
   - Add `0.0.0.0/0` (for Railway deployment)

### 2.5 Get Connection String

1. **Database** → Connect → Connect your application
2. Copy connection string:
   ```
   mongodb+srv://evil-twitter-user:<password>@evil-twitter-cluster.xxxxx.mongodb.net/evil_twitter?retryWrites=true&w=majority
   ```

### 2.6 Create Database Collections

```javascript
// Connect to MongoDB and create collections
use evil_twitter

// Collections will be created automatically when first data is inserted
// But you can pre-create them:
db.createCollection("users")
db.createCollection("tweets")
db.createCollection("follows")
db.createCollection("notifications")
```

---

## 3. Supabase Setup

### 3.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up and create new project
3. Project name: `evil-twitter`
4. Database password: Generate secure password
5. Region: Choose closest to your users

### 3.2 Configure Authentication

1. **Authentication** → Settings
2. **Site URL**: `https://your-frontend.vercel.app`
3. **Redirect URLs**:
   - `https://your-frontend.vercel.app/auth/callback`
   - `http://localhost:3001/auth/callback` (for development)

### 3.3 Configure Auth Providers

1. **Authentication** → Providers
2. **Email**: Enable (default)
3. **Google**: Optional (for easier signup)
4. **GitHub**: Optional (for developers)

### 3.4 Get Supabase Credentials

1. **Settings** → API
2. Copy:
   - Project URL: `https://your-project.supabase.co`
   - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3.5 Configure RLS (Row Level Security)

```sql
-- Enable RLS on auth.users table
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
CREATE POLICY "Users can read own data" ON auth.users
FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own data
CREATE POLICY "Users can update own data" ON auth.users
FOR UPDATE USING (auth.uid() = id);
```

---

## 4. Frontend Deployment (Vercel)

### 4.1 Prepare Frontend for Deployment

```bash
cd evil-twitter-frontend
```

### 4.2 Create Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=https://your-app-name.railway.app
```

### 4.3 Update API Configuration

Update `lib/services/api.ts`:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
```

### 4.4 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import project: `evil-twitter-frontend`
4. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL`
5. Deploy

---

## 5. Security Configuration

### 5.1 Backend Security

```rust
// Add to main.rs
use tower_http::cors::CorsLayer;

let cors = CorsLayer::new()
    .allow_origin("https://your-frontend.vercel.app".parse::<HeaderValue>().unwrap())
    .allow_origin("http://localhost:3001".parse::<HeaderValue>().unwrap())
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers([CONTENT_TYPE, AUTHORIZATION])
    .allow_credentials(true);
```

### 5.2 Environment Variables Security

- **Never commit** `.env` files to git
- **Use different** credentials for dev/staging/prod
- **Rotate** database passwords regularly
- **Limit** database user permissions

### 5.3 CORS Configuration

```rust
// Production CORS
let cors = CorsLayer::new()
    .allow_origin("https://your-frontend.vercel.app".parse::<HeaderValue>().unwrap())
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers([CONTENT_TYPE, AUTHORIZATION])
    .allow_credentials(true);
```

### 5.4 Rate Limiting (Optional)

```rust
// Add rate limiting middleware
use tower::ServiceBuilder;
use tower_http::limit::RateLimitLayer;

let app = app
    .layer(
        ServiceBuilder::new()
            .layer(RateLimitLayer::new(100, Duration::from_secs(60)))
    );
```

---

## 6. Monitoring & Logging

### 6.1 Backend Logging

```rust
// Add to main.rs
use tracing_subscriber;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("evil_twitter=debug,tower_http=debug")
        .init();

    // ... rest of main
}
```

### 6.2 Health Checks

- **Backend**: `GET /ping` → `{"status": "ok"}`
- **Database**: Check MongoDB connection
- **Frontend**: Check Supabase connection

### 6.3 Error Tracking (Optional)

- **Sentry**: For error tracking
- **LogRocket**: For session replay
- **Railway**: Built-in logs

---

## 7. Deployment Checklist

### 7.1 Pre-Deployment

- [ ] Backend compiles without errors
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] CORS properly configured
- [ ] Database connection working
- [ ] Authentication flow working

### 7.2 Backend Deployment

- [ ] Railway project created
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] Health check passing
- [ ] API endpoints responding

### 7.3 Database Setup

- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] Network access configured
- [ ] Connection string obtained
- [ ] Collections created

### 7.4 Authentication Setup

- [ ] Supabase project created
- [ ] Auth providers configured
- [ ] RLS policies set
- [ ] Credentials obtained

### 7.5 Frontend Deployment

- [ ] Vercel project created
- [ ] Environment variables set
- [ ] API URL updated
- [ ] Deployment successful
- [ ] Authentication working

### 7.6 Post-Deployment Testing

- [ ] User registration works
- [ ] User login works
- [ ] Tweet creation works
- [ ] Tweet like/attack/heal works
- [ ] Follow system works
- [ ] All features working end-to-end

---

## 8. Cost Estimation

### Monthly Costs (USD)

- **MongoDB Atlas**: $0 (M0 Sandbox)
- **Supabase**: $0 (Free tier)
- **Railway**: $5 (Hobby plan)
- **Vercel**: $0 (Free tier)
- **Total**: ~$5/month

### Scaling Costs

- **MongoDB Atlas M2**: $9/month (when you need more storage)
- **Railway Pro**: $20/month (when you need more resources)
- **Supabase Pro**: $25/month (when you need more features)

---

## 9. Troubleshooting

### Common Issues

#### 9.1 CORS Errors

```bash
# Check if CORS is properly configured
curl -H "Origin: https://your-frontend.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://your-backend.railway.app/ping
```

#### 9.2 Database Connection Issues

```bash
# Test MongoDB connection
mongosh "mongodb+srv://username:password@cluster.mongodb.net/evil_twitter"
```

#### 9.3 Authentication Issues

```javascript
// Check Supabase connection
const { data, error } = await supabase.auth.getSession();
console.log("Session:", data, "Error:", error);
```

#### 9.4 Environment Variables

```bash
# Check if environment variables are set
echo $MONGODB_URI
echo $NEXT_PUBLIC_SUPABASE_URL
```

---

## 10. Next Steps After Deployment

### 10.1 Immediate

1. **Test all features** end-to-end
2. **Monitor logs** for errors
3. **Set up alerts** for downtime
4. **Create backup** of database

### 10.2 Short-term

1. **Add error tracking** (Sentry)
2. **Implement rate limiting**
3. **Add input validation**
4. **Create admin dashboard**

### 10.3 Long-term

1. **Add monitoring** (DataDog, New Relic)
2. **Implement caching** (Redis)
3. **Add CDN** (CloudFlare)
4. **Scale database** (MongoDB Atlas M2+)

---

## 11. Quick Start Commands

### 11.1 Local Development

```bash
# Backend
cd evil-twitter-backend
cargo run

# Frontend
cd evil-twitter-frontend
npm run dev
```

### 11.2 Production Deployment

```bash
# Backend (Railway)
railway login
railway link
railway up

# Frontend (Vercel)
vercel login
vercel --prod
```

### 11.3 Environment Setup

```bash
# Backend
cp .env.example .env
# Edit .env with your MongoDB URI

# Frontend
cp .env.example .env.local
# Edit .env.local with your Supabase and API URLs
```

---

This plan should get your Evil Twitter MVP deployed and running in production within a few hours. The key is to follow the checklist and test each step before moving to the next one.
