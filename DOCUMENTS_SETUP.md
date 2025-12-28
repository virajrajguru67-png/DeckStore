# Documents Feature Setup

## Database Migration Required

The Documents feature requires a database migration to create the `documents` table. 

### Option 1: Using Supabase CLI

If you have Supabase CLI installed:

```bash
cd deck-store
supabase migration up
```

### Option 2: Manual Migration via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/006_documents_table.sql`
4. Paste and run the SQL in the SQL Editor

### Option 3: Using Supabase CLI (if linked)

If your project is linked to Supabase:

```bash
cd deck-store
supabase db push
```

## Verify Migration

After running the migration, verify the table exists:

1. Go to Supabase Dashboard → **Table Editor**
2. You should see a `documents` table with the following columns:
   - id (UUID)
   - name (TEXT)
   - description (TEXT)
   - content (JSONB)
   - owner_id (UUID)
   - folder_id (UUID, nullable)
   - tags (TEXT[])
   - is_favorite (BOOLEAN)
   - is_hidden (BOOLEAN)
   - deleted_at (TIMESTAMPTZ, nullable)
   - created_at (TIMESTAMPTZ)
   - updated_at (TIMESTAMPTZ)

## Troubleshooting

If you see errors like "Error fetching documents: Object":

1. **Check if migration was run**: Verify the `documents` table exists in your database
2. **Check RLS policies**: Ensure Row Level Security is enabled and policies are created
3. **Check browser console**: Look for detailed error messages that will help identify the issue
4. **Verify authentication**: Make sure you're logged in as the error might be RLS-related

## Features

Once set up, the Documents page allows you to:
- Create document projects with name, description, and tags
- Edit document details
- Delete documents (soft delete)
- Mark documents as favorites
- Hide documents
- View documents in grid or list mode




