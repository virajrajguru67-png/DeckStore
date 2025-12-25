# Deck Store - Enterprise Cloud File Management System

A comprehensive, enterprise-grade cloud file storage and management system built with React, TypeScript, and Supabase.

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn-ui (Radix UI) + Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL + Storage + Auth)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **File Handling**: Supabase Storage + IndexedDB for offline sync

## Features

### Core Features
- ✅ **File and Folder Management** - Upload, organize, rename, move, copy, delete files and folders
- ✅ **User Authentication** - Secure authentication with Supabase Auth
- ✅ **Role-Based Access Control** - Roles: viewer, editor, admin, owner with hierarchical permissions
- ✅ **Fine-Grained Permissions** - Set permissions at file and folder level (read, write, delete, share, admin)
- ✅ **File Versioning** - Automatic version creation, version history, and restore functionality
- ✅ **Recycle Bin** - Soft delete with restore capability and permanent deletion

### Sharing & Collaboration
- ✅ **Internal Sharing** - Share files/folders with specific users with permission controls
- ✅ **External Link Sharing** - Generate secure shareable links with password protection and expiration
- ✅ **Share Management** - View and manage all active shares

### File Preview
- ✅ **Comprehensive Preview System** - Supports:
  - Images (JPG, PNG, GIF, WebP, SVG, etc.) with zoom/rotate
  - PDF documents
  - Videos (MP4, WebM, etc.)
  - Audio files (MP3, WAV, etc.)
  - Text files with syntax highlighting
  - Code files with formatting

### Search & Organization
- ✅ **Full-Text Search** - Search files and folders by name
- ✅ **Advanced Filtering** - Filter by type, date, size, owner
- ✅ **Recent Files** - Quick access to recently accessed files
- ✅ **Favorites** - Star files for quick access
- ✅ **Quick Search** - Global search with keyboard shortcut (Cmd/Ctrl + K)

### Storage & Quotas
- ✅ **Storage Quota Management** - Per-user quota tracking and limits
- ✅ **Real-time Usage Display** - View storage usage with visual indicators
- ✅ **Quota Warnings** - Automatic warnings at 80%, 90%, and 100% capacity

### Admin Features
- ✅ **User Management** - View and manage users, assign roles
- ✅ **Storage Analytics** - System-wide storage monitoring
- ✅ **Activity Logs** - Comprehensive audit trail of all actions
- ✅ **System Settings** - Configure storage policies, sharing policies, security settings

### Notifications
- ✅ **In-App Notifications** - Real-time notifications for shares, updates, quota warnings
- ✅ **Notification Center** - Centralized notification management

### Offline Support
- ✅ **Offline Sync** - IndexedDB-based caching for offline access
- ✅ **Service Worker** - Browser-based offline capability
- ✅ **Sync Queue** - Queue actions when offline, sync when connection restored
- ✅ **Conflict Resolution** - Handle conflicts during sync

### Security
- ✅ **Row Level Security** - Database-level security policies
- ✅ **Encrypted Storage** - Supabase Storage encryption at rest
- ✅ **Access Monitoring** - Track all file access and operations
- ✅ **Compliance-Ready** - Audit trails for compliance requirements

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd deck-store
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

4. Set up Supabase:
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/` in order:
     - `001_initial_schema.sql`
     - `002_rls_policies.sql`
     - `003_storage_buckets.sql` (documentation only)
   - Create storage buckets in Supabase Dashboard:
     - `files` - Main file storage
     - `versions` - File version storage

5. Start the development server:
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:8080`

## Project Structure

```
deck-store/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # shadcn-ui components
│   │   ├── layout/      # Layout components
│   │   ├── file-explorer/
│   │   ├── file-operations/
│   │   ├── preview/
│   │   ├── sharing/
│   │   └── search/
│   ├── pages/           # Page components
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom React hooks
│   ├── services/        # Business logic services
│   ├── lib/             # Utility functions
│   ├── types/           # TypeScript types
│   └── integrations/    # Third-party integrations
├── supabase/
│   └── migrations/      # Database migrations
└── public/              # Static assets
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Database Migrations

Migrations are located in `supabase/migrations/`. Run them in order:
1. `001_initial_schema.sql` - Creates all tables and indexes
2. `002_rls_policies.sql` - Sets up Row Level Security policies
3. `003_storage_buckets.sql` - Documentation for storage setup

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

# DeckStore
