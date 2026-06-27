# Shramik Shanti Campus Website

Static college website with a Supabase-backed CMS admin panel.

## Run Locally

```bash
python -m http.server 8000
```

Open `http://localhost:8000/index.html`.

## Supabase Setup

The site is connected to the `my-portfolio` Supabase project:

```text
https://gxpgbrdldnwbuodawxsz.supabase.co
```

The CMS schema has been applied. To create an admin login:

1. Open Supabase Authentication.
2. Create a user with email and password.
3. Open `admin.html` and sign in with that email and password.

`supabase_fresh_schema.sql` resets the existing SSC CMS tables and `campus-assets` storage bucket before recreating them. It does not delete Supabase Authentication users.

Only create Supabase Authentication users for trusted admins, because any authenticated user can manage the CMS.

The admin panel supports notices, syllabus uploads, result uploads, popup notices, homepage content editing, and inquiry viewing.
