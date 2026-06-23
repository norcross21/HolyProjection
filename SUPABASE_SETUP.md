# Supabase Setup Instructions for HolyProjection

## Environment Variables Required

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## How to Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select an existing one
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Setting Up the Database Schema

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the schema

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Database Schema Overview

The schema includes the following tables:

- **profiles** - User profiles linked to auth.users
- **projects** - User projects with settings
- **lyrics** - Song lyrics with timing data
- **themes** - Custom themes (colors, fonts)
- **backgrounds** - Background configurations
- **screens** - Screen layouts for presentations
- **render_jobs** - Video rendering job queue

All tables have Row Level Security (RLS) policies to ensure users can only access their own data.

## Vercel Deployment

After setting up Supabase:

1. Go to your Vercel project at [vercel.com](https://vercel.com)
2. Navigate to **Settings** → **Environment Variables**
3. Add the same environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy your application

## Testing the Connection

Once configured, the app will automatically detect Supabase and enable:
- User authentication
- Project syncing
- Cloud storage for lyrics, themes, and backgrounds
- Render job management

If Supabase is not configured, the app runs in demo mode with local storage only.

## Editing SQL

To modify the database schema:

1. Edit the SQL files in `/supabase/migrations/`
2. Run the updated SQL in the Supabase SQL Editor
3. Or use `supabase db push` if using the CLI

For new migrations, create additional files with incrementing numbers:
- `002_add_new_feature.sql`
- `003_update_schema.sql`
