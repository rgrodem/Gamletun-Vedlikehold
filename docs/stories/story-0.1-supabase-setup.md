# Story 0.1: Supabase Project Setup

**Epic:** Epic 0 - Foundation & Setup
**Status:** Ready
**Priority:** P0
**Estimate:** 30 minutes

## User Story

As a **developer**, I want to **set up a Supabase project** so that **we have a backend database and authentication system**.

## Acceptance Criteria

- [ ] Supabase account created (if not exists)
- [ ] New Supabase project created: "gamletun-vedlikehold"
- [ ] Project URL and API keys obtained
- [ ] Environment variables documented

## Technical Tasks

### 1. Create Supabase Account (if needed)
- Go to https://supabase.com
- Sign up with GitHub or email
- Verify email

### 2. Create New Project
- Click "New Project"
- Organization: Create new "Gamletun"
- Project name: "gamletun-vedlikehold"
- Database password: Generate strong password (save securely!)
- Region: Europe West (closest to Norway)
- Pricing: Free tier

### 3. Get Credentials
Once project is ready (~2 minutes):
- Go to Project Settings → API
- Copy:
  - Project URL
  - `anon` public key
  - `service_role` secret key (keep secret!)

### 4. Document Environment Variables
Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## Dependencies

- None

## Definition of Done

- [ ] Supabase project accessible via dashboard
- [ ] .env.local file created with credentials
- [ ] Credentials tested (ping project URL)
- [ ] .env.local added to .gitignore

## Notes

- **NEVER commit .env.local to git!**
- Save database password in password manager
- Supabase free tier limits: 500MB database, 1GB storage, 50k MAU

---

**Next Story:** [Story 0.2 - Database Schema](./story-0.2-database-schema.md)
