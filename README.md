# NestJS Authenticated API

A NestJS API with JWT authentication using Supabase and PostgreSQL.

## Prerequisites

### 1. Node.js Version
This project requires Node.js version 22.12.0.

**Install using NVM (recommended):**

**Windows (nvm-windows):**
```bash
nvm install 22.12.0
nvm use 22.12.0
```

**macOS/Linux:**
```bash
nvm install 22.12.0
nvm use 22.12.0
```

Verify installation:
```bash
node --version  # Should show v22.12.0
```

### 2. NestJS CLI
Install the NestJS CLI globally:
```bash
npm install -g @nestjs/cli
```

Verify installation:
```bash
nest --version
```

### 3. Git
Ensure Git is installed for version control:
```bash
git --version
```

### Required CLIs

**Install NestJS CLI globally:**
```bash
npm install -g @nestjs/cli
```

**Verify installation:**
```bash
nest --version
```

## Supabase Setup

This project requires a Supabase project for database and authentication.

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be fully provisioned

### 2. Get Required Values from Supabase Dashboard

**Database Connection String:**
- Go to Settings → Database
- Copy the "Connection string" under "Direct connection"
- Use this for `DATABASE_URL`

**JWT Secret:**
- Go to Settings → API
- Copy the "JWT Secret" value
- Use this for `JWT_SECRET`

### 3. Database Schema
The API expects a `test` table. Create it in Supabase SQL Editor:
```sql
CREATE TABLE test (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

INSERT INTO test (name) VALUES ('Test Record Alpha');
```

## Features

- JWT Authentication with Supabase
- PostgreSQL database integration with TypeORM
- CORS enabled for frontend integration
- Health check endpoint
- Railway.com deployment ready

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file in the project root with the following variables:
```
DATABASE_URL="your-postgresql-connection-string"
JWT_SECRET="your-supabase-jwt-secret"
PORT=3000
```

3. **Environment Variables Setup:**
   - `DATABASE_URL`: Get from your Supabase project → Settings → Database → Connection string
   - `JWT_SECRET`: Get from your Supabase project → Settings → API → JWT Secret
   - `PORT`: Server port (default: 3000)

4. Start development server:
```bash
npm run start:dev
```

**Important:** Use `npm run start:dev` (not `nest start --watch`) to ensure proper environment loading.

## Railway.com Deployment

### Step 1: Deploy to Railway
1. Connect your GitHub repository to Railway
2. Railway will automatically detect the NestJS project

### Step 2: Set Environment Variables in Railway Dashboard
Go to your Railway project → Variables tab and add:

```
DATABASE_URL=your-postgresql-connection-string
JWT_SECRET=your-supabase-jwt-secret
```

**Where to get these values:**
- `DATABASE_URL`: Supabase → Settings → Database → Connection string (Direct connection)
- `JWT_SECRET`: Supabase → Settings → API → JWT Secret
- `PORT`: Automatically set by Railway (no action needed)

### Step 3: Railway Configuration Files
- `railway.json`: Railway service configuration
- `nixpacks.toml`: Build configuration with Node.js 20
- Health check endpoint: `/health` (for Railway monitoring)

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check (for Railway monitoring)
- `GET /test/1` - Protected endpoint (requires JWT authentication)

## Authentication

Uses Supabase JWT tokens. Include in requests as:
```
Authorization: Bearer <your-jwt-token>
```