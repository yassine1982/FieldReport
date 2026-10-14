# FieldReport

Mobile app for independent maintenance technicians to create professional intervention reports — clients, equipment, checklists, photos, signatures, and PDF export.

**Current milestone:** Local New Report creation flow with checklist, observations, AsyncStorage persistence, and report detail views. Auth, Supabase, payments, PDF, photos, and signatures are intentionally not included yet.

## Stack

- Expo SDK 57 + React Native
- Expo Router (file-based navigation)
- TypeScript (strict)

## Setup

```bash
npm install
npx expo start
```

Then press `i` for iOS simulator, `a` for Android, or `w` for web. Or open in Expo Go.

Target a booted simulator directly:

```bash
npx expo start --ios
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` / `npx expo start` | Start Metro |
| `npm run ios` | Start and open iOS |
| `npm run android` | Start and open Android |
| `npm run lint` | ESLint via Expo |
| `npm run typecheck` | `tsc --noEmit` |

## Architecture

Feature-based layout under `src/`. Routes stay thin; screens and domain UI live in features.

```
src/
  app/
    (tabs)/            # Home, Reports, Clients, Settings
    report/new.tsx     # Multi-step create flow
    report/[id].tsx    # Report detail
  components/ui/       # Button, Card, Input, Screen, AppText, EmptyState, StatusBadge
  context/             # ReportsProvider (live list + save)
  services/            # AsyncStorage persistence
  features/
    home/              # Dashboard cards + recent reports from saved data
    reports/           # Wizard steps, list, detail
    clients|settings/  # Placeholders
  types/report.ts      # Report, checklist, draft types
  utils/               # IDs, stats, date helpers
```

Path alias: `@/*` → `src/*`

Local reports are stored with `@react-native-async-storage/async-storage` under key `fieldreport.reports.v1`.

## Design system

Professional blue / white palette with reusable tokens:

- **Primary:** `#1B6BC8`
- **Background:** `#F4F7FB`
- **Surfaces:** white cards with light borders
- **Touch targets:** minimum 44pt
- Components: `Button`, `Card`, `Input`, `Screen`, `AppText`

## Product roadmap (high level)

1. Home + design system
2. Local report creation + persistence *(this milestone)*
3. Photos + client signature
4. PDF export / sharing
5. Auth, sync, Free/Pro limits

## License

See [LICENSE](./LICENSE).
