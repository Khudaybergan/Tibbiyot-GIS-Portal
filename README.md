# Tibbiyot GIS Portal

An interactive Geographic Information System (GIS) portal for medical infrastructure in Uzbekistan. This platform provides a premium public-facing map for citizens and a robust, secure administrative suite for healthcare officials.

## 🌟 Project Overview

This portal serves as a centralized hub for managing and visualizing medical institutions across Uzbekistan. It features high-fidelity mapping, strict data validation, and a comprehensive administrative workflow including moderation and auditing.

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [ShadCN UI](https://ui.shadcn.com/) / [Radix UI](https://www.radix-ui.com/)
- **Mapping**: [MapLibre GL JS](https://maplibre.org/) / [react-map-gl](https://visgl.github.io/react-map-gl/)
- **Backend**: [Supabase](https://supabase.com/) (PostgreSQL + PostGIS)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/)

## 🚀 Key Features

### 🌍 Public GIS Portal
- **Premium UI**: Modern glassmorphism design with smooth animations.
- **Interactive Map**: Uzbekistan-focused map with custom boundaries and masking.
- **Advanced Filtering**: Search by name, INN, type (State, Private, Pharmacy, etc.), and region.
- **Proximity Search**: Filter institutions by distance to the nearest airport.
- **Dynamic Routing**: Visualize routes from institutions to critical transport hubs.

### 🛡 Admin Suite
- **Registry Management**: A strict, professional table for managing thousands of medical objects.
- **Smart Forms**: Manual entry with mandatory map-based coordinate confirmation and Uzbekistan boundary enforcement.
- **Data Ingestion**:
    - **Import Wizard**: Multi-format support (CSV, Excel, GeoJSON, JSON) with intelligent column mapping.
    - **Bulk Paste**: Excel-to-Web integration allowing direct copy-paste from spreadsheets with inline validation.
- **Moderation Workflow**: A change-request system where sensitive updates require multi-level approval with a visual "diff" viewer.
- **Audit Logs**: Immutable activity tracking capturing who, what, when, and from where (IP/User-Agent).

### 🔑 Security & Permissions
- **RBAC (Role-Based Access Control)**:
    - `super_admin`: Full system control and user management.
    - `admin`: Data registry management and moderation approval.
    - `moderator`: Data review and change request creation.
    - `operator`: Data entry and draft management.
    - `institution_director`: Access restricted to their specific medical center.
    - `viewer`: Read-only access.
- **Server-Side Protection**: Route guarding via Next.js Middleware and server-side Supabase session checks.
- **User Roles Table**: Users can hold multiple roles (`user_roles` table — not a single `profiles.role` column).

## 📂 Project Structure

```text
src/
├── app/               # Next.js App Router (Public & Admin routes)
├── components/        # UI Components
│   ├── admin/         # Registry, Import, Moderation, and Audit components
│   ├── map/           # MapLibre integrations and custom controls
│   ├── public/        # Premium landing and portal components
│   └── ui/            # Shared ShadCN base components
├── context/           # Global State (MapProvider)
├── hooks/             # Custom React hooks (useMap, useIsMobile)
├── lib/               # Utilities, Types, and Mock Data
│   ├── auth/          # Permission matrices and role logic
│   ├── map/           # GIS helpers and boundaries
│   ├── admin/         # Specialized logic for administrative modules
│   └── supabase/      # Supabase client, server, and DB type stubs
└── middleware.ts      # Auth and Role-based route protection
```

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- Supabase project with PostgreSQL + PostGIS

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Install Supabase packages:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```
4. Set up environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```

### Development
```bash
npm run dev
```

## 🗄 Database Schema (Planned)

Key tables in PostgreSQL + PostGIS:

| Table | Purpose |
|-------|---------|
| `medical_objects` | All medical institutions with PostGIS geometry |
| `regions` | Viloyat boundaries (GeoJSON → PostGIS) |
| `districts` | Tuman boundaries |
| `user_roles` | Multi-role RBAC per user |
| `moderation_requests` | Change/delete approval workflow |
| `audit_logs` | Immutable action history |

Type definitions: [`src/lib/supabase/types.ts`](src/lib/supabase/types.ts)

## 🗺 GIS Specifications
- **Projection**: EPSG:4326 (WGS 84)
- **Bounding Box**:
    - Longitude: 55.8° to 73.3°
    - Latitude: 37.0° to 45.7°
- **Base Maps**: Voyager (Default), Positron (Light), Dark Matter.
- **GIS Data Formats Supported for Import**: GeoJSON, JSON, CSV, Excel (.xlsx)

## 📝 License
Proprietary. All rights reserved.
