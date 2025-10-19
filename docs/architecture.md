# Architecture Document
# Gamletun Vedlikehold App

**Version:** 1.0
**Date:** 18. Oktober 2025
**Architect:** Winston (BMAD Architect Agent)
**Status:** Draft
**Related Documents:** [PRD](./prd.md)

---

## Executive Summary

Gamletun Vedlikehold er en moderne, full-stack webapplikasjon bygget på Next.js 15 og Supabase. Arkitekturen er designet for enkel vedlikehold, lav kostnad, og skalerbarhet fra 5 til 20+ brukere uten endringer.

### Key Architectural Decisions

- **Monolith Frontend:** Next.js App Router med Server Components
- **Backend-as-a-Service:** Supabase (PostgreSQL + Auth + Storage)
- **Styling:** Tailwind CSS v4 med zero-config
- **Deployment:** Vercel (frontend) + Supabase Cloud (backend)
- **Cost Target:** 0 kr/måned for 5 brukere

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Patterns](#3-architecture-patterns)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Design](#6-database-design)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [File Storage](#8-file-storage)
9. [API Design](#9-api-design)
10. [Security](#10-security)
11. [Performance](#11-performance)
12. [Deployment](#12-deployment)
13. [Monitoring & Logging](#13-monitoring--logging)
14. [Scalability](#14-scalability)
15. [Cost Analysis](#15-cost-analysis)
16. [Development Workflow](#16-development-workflow)
17. [Testing Strategy](#17-testing-strategy)
18. [Risks & Mitigations](#18-risks--mitigations)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Devices                        │
│  (Mobile Browser, Desktop Browser, Tablet)              │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────┐
│               Vercel Edge Network (CDN)                 │
│  - Next.js SSR/SSG                                      │
│  - Static Assets                                        │
│  - Edge Functions                                       │
└────────────────┬────────────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
┌─────────────┐      ┌─────────────────────────────┐
│  Next.js    │      │      Supabase Cloud         │
│  Frontend   │◄────►│  - PostgreSQL Database      │
│  (React 19) │      │  - Authentication           │
│             │      │  - Storage (Images)         │
│             │      │  - Real-time (optional)     │
└─────────────┘      └─────────────────────────────┘
```

### 1.2 Component Interaction Flow

```
User Action → Next.js Client Component → Supabase Client →
Supabase API → PostgreSQL + Row Level Security →
Response → React State Update → UI Update
```

---

## 2. Technology Stack

### 2.1 Frontend

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Next.js | 15.5+ | Server Components, App Router, best DX |
| UI Library | React | 19.x | Industry standard, large ecosystem |
| Language | TypeScript | 5.x | Type safety, better DX |
| Styling | Tailwind CSS | 4.x | Utility-first, zero-config, fast |
| Icons | React Icons | 5.x | Comprehensive icon library |
| State Management | React Hooks | - | Built-in, sufficient for app complexity |
| Forms | React Hook Form | Latest | Performance, validation |
| Validation | Zod | Latest | TypeScript-first schema validation |

### 2.2 Backend

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| BaaS | Supabase | Latest | Free tier, PostgreSQL, auth, storage |
| Database | PostgreSQL | 15+ | Robust, ACID, JSON support |
| Auth | Supabase Auth | - | Built-in, email invitations |
| Storage | Supabase Storage | - | S3-compatible, CDN |
| API | Auto-generated REST | - | Supabase PostgREST |

### 2.3 DevOps & Tooling

| Purpose | Technology | Rationale |
|---------|-----------|-----------|
| Hosting | Vercel | Zero-config Next.js deployment |
| Version Control | Git | Industry standard |
| Package Manager | npm | Built into Node.js |
| Linting | ESLint | Next.js default |
| Formatting | Prettier | Code consistency |

---

## 3. Architecture Patterns

### 3.1 Architectural Style

**Jamstack + BaaS Hybrid**
- **Frontend:** Static generation + Server-Side Rendering
- **Backend:** Backend-as-a-Service (Supabase)
- **Data:** Client-side data fetching via Supabase client

### 3.2 Design Patterns

1. **Server Components Pattern** (Next.js 15)
   - Default: Server Components for data fetching
   - Client Components only when interactivity needed

2. **Repository Pattern**
   - Abstract Supabase queries into service layer
   - `lib/services/equipment.ts`, `lib/services/maintenance.ts`

3. **Component Composition**
   - Atomic Design principles
   - Reusable UI components in `/components`

4. **Route-based Code Splitting**
   - Next.js automatic code splitting
   - Lazy load heavy components

---

## 4. Frontend Architecture

### 4.1 Directory Structure

```
gamletun-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Dashboard (/)
│   ├── globals.css              # Tailwind CSS
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── equipment/
│   │   ├── page.tsx            # Equipment list
│   │   └── [id]/
│   │       └── page.tsx        # Equipment detail
│   └── reports/
│       └── page.tsx            # Reports page
├── components/                   # React components
│   ├── ui/                      # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── Input.tsx
│   ├── equipment/
│   │   ├── EquipmentCard.tsx
│   │   ├── EquipmentForm.tsx
│   │   └── EquipmentList.tsx
│   ├── maintenance/
│   │   ├── MaintenanceForm.tsx
│   │   └── MaintenanceHistory.tsx
│   └── layout/
│       ├── Navigation.tsx
│       └── Footer.tsx
├── lib/                         # Utilities & services
│   ├── supabase/
│   │   ├── client.ts           # Supabase client
│   │   └── server.ts           # Server-side client
│   ├── services/
│   │   ├── equipment.ts        # Equipment CRUD
│   │   ├── maintenance.ts      # Maintenance CRUD
│   │   └── reports.ts          # Report generation
│   ├── hooks/
│   │   ├── useEquipment.ts
│   │   └── useMaintenance.ts
│   └── utils/
│       ├── date.ts
│       └── validation.ts
├── public/                      # Static assets
│   └── icons/
├── types/                       # TypeScript types
│   ├── database.ts             # Supabase generated types
│   └── index.ts
└── package.json
```

### 4.2 Component Architecture

**Component Hierarchy:**

```
App
├── Layout (Server Component)
│   ├── Navigation (Client Component)
│   └── Footer (Server Component)
└── Page (Server Component)
    ├── EquipmentList (Server Component)
    │   └── EquipmentCard (Client Component - interactive)
    ├── StatsCards (Server Component)
    └── CreateButton (Client Component - opens modal)
```

**Component Principles:**
- Server Components by default
- Client Components marked with `'use client'`
- Props flow down, events flow up
- Composition over inheritance

### 4.3 State Management Strategy

**No global state management needed!**

- **Server State:** React Query / Supabase Realtime
- **UI State:** React useState/useReducer
- **Form State:** React Hook Form
- **URL State:** Next.js routing

### 4.4 Data Fetching Strategy

**Server Components (Preferred):**
```typescript
// app/equipment/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function EquipmentPage() {
  const supabase = createServerClient()
  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')

  return <EquipmentList equipment={equipment} />
}
```

**Client Components (when needed):**
```typescript
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function EquipmentCard() {
  const [equipment, setEquipment] = useState([])

  useEffect(() => {
    supabase.from('equipment').select('*')
      .then(({ data }) => setEquipment(data))
  }, [])
}
```

---

## 5. Backend Architecture

### 5.1 Supabase Stack

**Core Services:**

1. **PostgreSQL Database**
   - Primary data store
   - Row Level Security (RLS) for auth
   - JSONB for flexible data

2. **Authentication**
   - Email + Password
   - Magic Links (optional)
   - Admin-only user creation

3. **Storage**
   - Image uploads
   - Public/Private buckets
   - CDN delivery

4. **PostgREST API**
   - Auto-generated REST API
   - Direct database access
   - Real-time subscriptions (optional)

### 5.2 Service Layer

**Abstraction over Supabase:**

```typescript
// lib/services/equipment.ts
export const equipmentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('equipment')
      .select('*, category:categories(*)')
    if (error) throw error
    return data
  },

  async create(equipment: EquipmentInsert) {
    const { data, error } = await supabase
      .from('equipment')
      .insert(equipment)
      .select()
    if (error) throw error
    return data[0]
  },

  // ... more methods
}
```

**Benefits:**
- Centralized query logic
- Easy to test
- Can swap backend later if needed

---

## 6. Database Design

### 6.1 Schema Overview

```sql
-- Users (managed by Supabase Auth)
auth.users
  ├── id (uuid)
  ├── email
  └── metadata

-- User Profiles (extended user data)
public.profiles
  ├── id (uuid, FK → auth.users)
  ├── full_name (text)
  ├── role (enum: 'admin', 'user')
  ├── created_at (timestamp)
  └── updated_at (timestamp)

-- Equipment Categories
public.categories
  ├── id (uuid)
  ├── name (text)
  ├── icon (text)
  ├── color (text)
  └── created_at (timestamp)

-- Equipment
public.equipment
  ├── id (uuid)
  ├── name (text)
  ├── category_id (uuid, FK → categories)
  ├── model (text, nullable)
  ├── image_url (text, nullable)
  ├── status (enum: 'active', 'inactive', 'maintenance')
  ├── created_by (uuid, FK → profiles)
  ├── created_at (timestamp)
  └── updated_at (timestamp)

-- Maintenance Types
public.maintenance_types
  ├── id (uuid)
  ├── equipment_id (uuid, FK → equipment)
  ├── type_name (text)
  ├── created_at (timestamp)

-- Maintenance Logs
public.maintenance_logs
  ├── id (uuid)
  ├── equipment_id (uuid, FK → equipment)
  ├── maintenance_type_id (uuid, FK → maintenance_types)
  ├── description (text, nullable)
  ├── performed_by (uuid, FK → profiles)
  ├── performed_date (date)
  ├── images (text[], array of image URLs)
  ├── created_at (timestamp)
  └── updated_at (timestamp)
```

### 6.2 Complete SQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Categories table
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify categories"
  ON public.categories FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Equipment table
CREATE TABLE public.equipment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  model TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_by UUID REFERENCES public.profiles ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view equipment"
  ON public.equipment FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create equipment"
  ON public.equipment FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update equipment"
  ON public.equipment FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can delete equipment"
  ON public.equipment FOR DELETE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Maintenance Types table
CREATE TABLE public.maintenance_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment ON DELETE CASCADE NOT NULL,
  type_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(equipment_id, type_name)
);

ALTER TABLE public.maintenance_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view maintenance types"
  ON public.maintenance_types FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage maintenance types"
  ON public.maintenance_types FOR ALL
  USING (auth.role() = 'authenticated');

-- Maintenance Logs table
CREATE TABLE public.maintenance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment ON DELETE CASCADE NOT NULL,
  maintenance_type_id UUID REFERENCES public.maintenance_types ON DELETE SET NULL,
  description TEXT,
  performed_by UUID REFERENCES public.profiles ON DELETE SET NULL NOT NULL,
  performed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view maintenance logs"
  ON public.maintenance_logs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create maintenance logs"
  ON public.maintenance_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own maintenance logs"
  ON public.maintenance_logs FOR UPDATE
  USING (performed_by = auth.uid());

CREATE POLICY "Users can delete own maintenance logs"
  ON public.maintenance_logs FOR DELETE
  USING (performed_by = auth.uid());

-- Indexes for performance
CREATE INDEX idx_equipment_category ON public.equipment(category_id);
CREATE INDEX idx_maintenance_logs_equipment ON public.maintenance_logs(equipment_id);
CREATE INDEX idx_maintenance_logs_performed_date ON public.maintenance_logs(performed_date DESC);
CREATE INDEX idx_maintenance_types_equipment ON public.maintenance_types(equipment_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_logs_updated_at
  BEFORE UPDATE ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 6.3 Relationships

```
profiles (1) ──→ (N) equipment (created_by)
profiles (1) ──→ (N) maintenance_logs (performed_by)
categories (1) ──→ (N) equipment
equipment (1) ──→ (N) maintenance_types
equipment (1) ──→ (N) maintenance_logs
maintenance_types (1) ──→ (N) maintenance_logs
```

---

## 7. Authentication & Authorization

### 7.1 Authentication Flow

**User Registration (Admin-only):**

```
1. Admin logs in
2. Admin navigates to "Invite User"
3. Admin enters email
4. Supabase sends magic link/invitation email
5. User clicks link → sets password
6. User can log in
```

**User Login:**

```
1. User navigates to /login
2. Enters email + password
3. Supabase validates credentials
4. JWT token stored in httpOnly cookie
5. Redirect to dashboard
```

### 7.2 Authorization via RLS

**Row Level Security Policies:**

- **Profiles:** Users can read all, update own
- **Equipment:** All authenticated users can CRUD
- **Maintenance Logs:** Users can create, edit/delete own
- **Admin-only:** Delete equipment, manage users

### 7.3 Implementation

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// lib/supabase/server.ts
import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

---

## 8. File Storage

### 8.1 Supabase Storage Buckets

**Bucket Structure:**

```
equipment-images/
  ├── {equipment_id}/
  │   └── {timestamp}_{filename}.jpg
  └── ...

maintenance-images/
  ├── {maintenance_log_id}/
  │   ├── image1.jpg
  │   ├── image2.jpg
  │   └── ...
  └── ...
```

### 8.2 Upload Flow

```
1. User selects image(s) in form
2. Frontend compresses image (if >2MB)
3. Upload to Supabase Storage
4. Get public URL
5. Save URL to database
6. Display image via CDN
```

### 8.3 Implementation

```typescript
// lib/services/storage.ts
export async function uploadEquipmentImage(
  equipmentId: string,
  file: File
): Promise<string> {
  const fileName = `${Date.now()}_${file.name}`
  const filePath = `${equipmentId}/${fileName}`

  const { error } = await supabase.storage
    .from('equipment-images')
    .upload(filePath, file)

  if (error) throw error

  const { data } = supabase.storage
    .from('equipment-images')
    .getPublicUrl(filePath)

  return data.publicUrl
}
```

### 8.4 Storage Policies

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'equipment-images' AND auth.role() = 'authenticated');

-- Anyone can view images
CREATE POLICY "Anyone can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'equipment-images');
```

---

## 9. API Design

### 9.1 API Architecture

**Supabase PostgREST provides auto-generated REST API:**

```
GET    /equipment              → List all equipment
GET    /equipment?id=eq.{id}   → Get single equipment
POST   /equipment              → Create equipment
PATCH  /equipment?id=eq.{id}   → Update equipment
DELETE /equipment?id=eq.{id}   → Delete equipment
```

### 9.2 Service Layer Abstraction

```typescript
// lib/services/equipment.ts
export const equipmentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        category:categories(*),
        maintenance_types(*),
        latest_maintenance:maintenance_logs(*)
          .order('performed_date', { ascending: false })
          .limit(1)
      `)
      .order('name')

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        category:categories(*),
        maintenance_types(*),
        maintenance_logs(*, performed_by:profiles(*))
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async create(equipment: EquipmentInsert) {
    const { data, error } = await supabase
      .from('equipment')
      .insert({
        ...equipment,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: EquipmentUpdate) {
    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
```

---

## 10. Security

### 10.1 Security Layers

1. **Transport Security:** HTTPS everywhere
2. **Authentication:** Supabase Auth with JWT
3. **Authorization:** Row Level Security (RLS)
4. **Input Validation:** Zod schemas
5. **CSRF Protection:** Next.js built-in
6. **XSS Protection:** React auto-escaping
7. **SQL Injection:** Parameterized queries (Supabase)

### 10.2 Environment Variables

```env
# Public (embedded in client)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# Private (server-only)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
DATABASE_URL=postgresql://xxx
```

### 10.3 Content Security Policy

```typescript
// next.config.js
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`
```

---

## 11. Performance

### 11.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Total Blocking Time | < 300ms | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |

### 11.2 Optimization Strategies

**Frontend:**
- Server Components for zero JS
- Image optimization (Next.js Image)
- Code splitting (automatic)
- Lazy loading (React.lazy)
- Tailwind CSS purging (automatic)

**Backend:**
- Database indexes on foreign keys
- Connection pooling (Supabase Pooler)
- CDN for images (Supabase Storage)

**Network:**
- HTTP/2 (Vercel)
- Gzip/Brotli compression
- CDN caching

### 11.3 Caching Strategy

```typescript
// Server Component with caching
export const revalidate = 60 // Revalidate every 60s

export default async function EquipmentPage() {
  const equipment = await equipmentService.getAll()
  return <EquipmentList equipment={equipment} />
}
```

---

## 12. Deployment

### 12.1 Deployment Architecture

```
Code Push → GitHub → Vercel CI/CD → Build → Deploy → Edge Network
                                           ↓
                                     Supabase Cloud
```

### 12.2 Environments

| Environment | Purpose | URL | Branch |
|-------------|---------|-----|--------|
| Development | Local dev | localhost:3000 | - |
| Preview | PR previews | *.vercel.app | feature/* |
| Production | Live app | gamletun-vedlikehold.vercel.app | main |

### 12.3 Deployment Process

**Automatic:**
1. Push to `main` branch
2. Vercel detects commit
3. Runs `npm run build`
4. Deploys to production
5. Automatic rollback if build fails

**Manual:**
```bash
npm run build
vercel --prod
```

### 12.4 Database Migrations

**Using Supabase CLI:**
```bash
# Create migration
supabase migration new add_equipment_table

# Apply migration
supabase db push

# Reset (dev only)
supabase db reset
```

---

## 13. Monitoring & Logging

### 13.1 Monitoring Stack

- **Application:** Vercel Analytics
- **Database:** Supabase Dashboard
- **Errors:** Console + Vercel Logs
- **Uptime:** Vercel (built-in)

### 13.2 Key Metrics

- Request/response times
- Error rates
- Database query performance
- User sessions
- Page views

### 13.3 Logging Strategy

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta)
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error)
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta)
  }
}
```

---

## 14. Scalability

### 14.1 Scalability Targets

| Users | Database Size | Storage | Performance |
|-------|--------------|---------|-------------|
| 5 (launch) | < 100 MB | < 1 GB | < 2s load |
| 20 (growth) | < 500 MB | < 5 GB | < 2s load |
| 50 (future) | < 2 GB | < 20 GB | < 3s load |

### 14.2 Scalability Strategy

**Horizontal Scaling:**
- Vercel auto-scales frontend
- Supabase handles database scaling
- CDN for static assets

**Database Optimization:**
- Indexes on foreign keys
- Limit queries with `.limit()`
- Pagination for large lists

**When to Upgrade:**
- **Supabase Free → Pro:** > 500 MB database OR > 1 GB storage
- **Vercel Free → Pro:** > 100 GB bandwidth/month

---

## 15. Cost Analysis

### 15.1 Current Stack Costs (5 users)

| Service | Tier | Cost | Limits |
|---------|------|------|--------|
| Vercel | Free | 0 kr | 100 GB bandwidth, Unlimited requests |
| Supabase | Free | 0 kr | 500 MB database, 1 GB storage, 50,000 monthly active users |
| Domain | Existing | 0 kr | gamletun.no already owned |
| **Total** | | **0 kr/måned** | |

### 15.2 Projected Costs (20 users)

| Service | Tier | Cost | Notes |
|---------|------|------|-------|
| Vercel | Free | 0 kr | Still within limits |
| Supabase | Pro | $25/måned | If > 500 MB OR > 1 GB storage |
| **Total** | | **$25/måned (~250 kr)** | Only if needed |

### 15.3 Cost Optimization

- Use image compression (reduce storage)
- Implement pagination (reduce bandwidth)
- Archive old logs (reduce database size)
- Monitor usage monthly

---

## 16. Development Workflow

### 16.1 Branch Strategy

```
main              → Production
  └── develop     → Staging
      └── feature/* → Feature branches
```

### 16.2 Development Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/add-equipment-form
   ```

2. **Develop locally**
   ```bash
   npm run dev
   ```

3. **Test changes**
   ```bash
   npm run lint
   npm run build
   ```

4. **Commit & push**
   ```bash
   git add .
   git commit -m "feat: add equipment form"
   git push origin feature/add-equipment-form
   ```

5. **Create Pull Request**
   - Vercel creates preview deployment
   - Review code
   - Merge to main

### 16.3 Code Quality

- **ESLint:** Linting
- **Prettier:** Formatting
- **TypeScript:** Type checking
- **Zod:** Runtime validation

---

## 17. Testing Strategy

### 17.1 Testing Pyramid

```
        /\
       /  \  E2E Tests (Manual initially)
      /____\
     /      \  Integration Tests (Future)
    /________\
   /          \  Unit Tests (Critical functions)
  /____________\
```

### 17.2 Testing Approach

**Phase 1 (MVP):**
- Manual testing
- Type safety (TypeScript)
- Schema validation (Zod)

**Phase 2 (Growth):**
- Unit tests (Jest/Vitest)
- Integration tests (Supabase)
- E2E tests (Playwright)

---

## 18. Risks & Mitigations

### 18.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Supabase free tier exceeded | Medium | High | Monitor usage, upgrade if needed |
| Image storage fills up | Low | Medium | Image compression, set max upload size |
| Database performance degrades | Low | Medium | Indexes, pagination, query optimization |
| User accidentally deletes equipment | Medium | High | Soft delete, confirmation dialogs |
| Concurrent edits conflict | Low | Low | Optimistic locking, timestamp checks |

### 18.2 Business Risks

| Risk | Mitigation |
|------|------------|
| Users don't adopt app | Simple UX, training, onboarding |
| Data loss | Daily backups, export functionality |
| Security breach | RLS, HTTPS, regular updates |

---

## Appendix

### A. Database ER Diagram

```
┌─────────────┐
│  profiles   │
├─────────────┤
│ id (PK)     │
│ full_name   │
│ role        │
└──────┬──────┘
       │
       │ created_by
       ▼
┌─────────────┐      ┌──────────────┐
│  equipment  │──────│  categories  │
├─────────────┤ M:1  ├──────────────┤
│ id (PK)     │      │ id (PK)      │
│ name        │      │ name         │
│ category_id │◄─────│ icon         │
│ model       │      │ color        │
│ image_url   │      └──────────────┘
│ status      │
│ created_by  │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌─────────────────────┐
│ maintenance_types   │
├─────────────────────┤
│ id (PK)             │
│ equipment_id (FK)   │
│ type_name           │
└──────┬──────────────┘
       │
       │ 1:N
       ▼
┌─────────────────────┐
│ maintenance_logs    │
├─────────────────────┤
│ id (PK)             │
│ equipment_id (FK)   │
│ maintenance_type_id │
│ description         │
│ performed_by (FK)   │
│ performed_date      │
│ images[]            │
└─────────────────────┘
```

### B. Technology Alternatives Considered

| Component | Chosen | Alternatives | Reason |
|-----------|--------|--------------|--------|
| Frontend Framework | Next.js | Vite, Remix | Best DX, Vercel integration |
| Backend | Supabase | Firebase, Appwrite | PostgreSQL, open source |
| Styling | Tailwind v4 | MUI, Chakra | Fastest, smallest bundle |
| Hosting | Vercel | Netlify, Railway | Best Next.js support |

---

**Document Status:** ✅ Ready for Review
**Next Step:** PO Master Checklist
**Approval Required:** Product Owner sign-off

---

*Generated with BMAD-METHOD™ Architect Agent (Winston)*
