# Word Alive Ministries

Word Alive Ministries is an Expo React Native mobile app for Android and iOS.
It gives church members daily Bible-reading guidance, reading-progress tracking,
a Bible-study calendar, Bible-study details, accessibility preferences, and a
private profile photo.

## Current MVP status

The production Supabase project is connected. Email-and-password sign-in,
daily reading completion and streaks, the 2026 reading plan, Study, Calendar,
and Profile are connected and verified on a physical iPhone. The detailed
verified record and remaining release work are in
[`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).

## Repository layout

```text
app/        Expo React Native application
supabase/   Versioned Supabase SQL migrations and database notes
docs/       Project status, architecture, test plan, release checklist, and plan
```

## Requirements

- Node.js and npm compatible with Expo SDK 58.
- An Expo account and Expo Go for prototype testing.
- A production Supabase project.
- An iPhone or Android device for real-device testing.

## Local setup

1. Open the repository in VS Code.
2. Open **Terminal** then **New Terminal**.
3. Run these commands:

```powershell
Set-Location -LiteralPath 'C:\Dev\Word Alive Ministries\app'
npm ci
```

4. Create `C:\Dev\Word Alive Ministries\app\.env` manually. The repository
   intentionally has no `.env.example` file. Add exactly these two lines,
   replacing the values with the production Supabase values:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Never put a Supabase secret key or service-role key in this file, source code,
documentation, or an Expo public environment variable. The `.env` file is
Git-ignored and must never be committed.

5. Verify the connection:

```powershell
npm run verify:supabase
```

Expected result:

```text
Supabase connection verified: Auth settings responded with HTTP 200.
```

6. Start the app:

```powershell
npm start -- --clear
```

Use the iPhone Camera app or Expo Go to open the QR code. Current iOS Expo Go
requires Expo SDK 58.

## Database setup

Apply the migrations in `supabase/migrations/` to a new production Supabase
project in filename order. Do not run prototype scripts against the production
project. The production migrations establish the secure schema, import the
approved 2026 reading schedule, and repair daily-reading completion.

After the first pastor account has been created, assign the pastor role using
the controlled SQL instructions in [`supabase/README.md`](supabase/README.md).
Do not give the mobile app the service-role key.

## Bible text

The reader uses the King James Version (KJV) from `bible-api.com`. A verified
daily first-verse preview is on its own feature branch and will use the same
KJV provider when merged. The app labels this text as KJV and caches passage
requests on the device. The provider is free but rate-limited and does not
guarantee availability; do not use it to bulk-download the Bible. Reassess
Bible-text rights and provider reliability before a worldwide public release.

## Development workflow

Use one branch for each bounded feature or fix:

```text
feature/short-description
fix/short-description
docs/short-description
```

Run `npx tsc --noEmit` from `app/`, complete the relevant physical-device
test, update the status document, and then create a pull request into `main`.
Never commit `.env` files, Supabase secret keys, signing certificates, or
member data.

## Key documents

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md)
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)
- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)

## Licence

This repository currently has no project-wide open-source licence. Treat the
application source as private Word Alive Ministries project material unless the
project owner publishes a licence deliberately.
