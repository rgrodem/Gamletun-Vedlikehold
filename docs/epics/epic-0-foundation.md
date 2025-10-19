# Epic 0: Foundation & Setup

**Status:** In Progress
**Priority:** P0 (Critical)
**Estimate:** 2 hours

## Overview

Set up the foundational infrastructure for Gamletun Vedlikehold app, including database, authentication, and core project structure.

## Goals

- Supabase project created and configured
- Database schema deployed
- Authentication working
- Environment variables configured
- Core project structure ready

## User Stories

1. **Story 0.1:** Supabase Project Setup
2. **Story 0.2:** Database Schema Creation
3. **Story 0.3:** Authentication Configuration
4. **Story 0.4:** Environment Variables Setup

## Dependencies

- None (this is the foundation)

## Success Criteria

- [ ] Can create an account via Supabase
- [ ] Can log in to the app
- [ ] Database tables exist
- [ ] RLS policies active
- [ ] App connects to Supabase successfully

## Technical Notes

- Use Supabase free tier
- Follow Architecture doc database schema exactly
- Keep all credentials in .env.local (never commit!)

---

**Related Documents:**
- [PRD](../prd.md)
- [Architecture](../architecture.md)
