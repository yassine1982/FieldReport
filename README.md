# FieldReport

Mobile app for independent maintenance technicians to create professional intervention reports — clients, equipment, checklists, photos, signatures, and PDF export.

**Current milestone:** Local company branding, client signature capture, and branded PDF export — all on-device. Auth, Supabase, and payments are intentionally not included yet.

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
  services/            # AsyncStorage, photos, signatures, company profile, PDF
  features/
    home/              # Dashboard cards + recent reports from saved data
    reports/           # Wizard steps, list, detail, signature, PDF actions
    settings/          # Local company branding profile
    clients/           # Placeholder
  types/               # Report + company types
  utils/               # IDs, stats, content digests, date helpers
```

Path alias: `@/*` → `src/*`

### Local storage

| Data | Location |
| --- | --- |
| Report metadata | AsyncStorage `fieldreport.reports.v1` |
| Company profile | AsyncStorage `fieldreport.company.v1` |
| Evidence photos | Document dir `report-photos/` |
| Signature PNGs | Document dir `report-signatures/` |
| Company logo | Document dir `company-assets/` |
| Generated PDFs | Document dir `report-pdfs/` |

Large image bytes are never stored in AsyncStorage — only file URIs and metadata.

Report migration remains in-place on `fieldreport.reports.v1`: missing `photos` / invalid entries are normalized; optional `signature` metadata is validated and reconciled against a content digest. Missing signature files are dropped.

## Design system

Professional blue / white palette with reusable tokens:

- **Primary:** `#1B6BC8`
- **Background:** `#F4F7FB`
- **Surfaces:** white cards with light borders
- **Touch targets:** minimum 44pt
- Components: `Button`, `Card`, `Input`, `Screen`, `AppText`

## Product roadmap (high level)

1. Home + design system
2. Local report creation + draft lifecycle
3. Photos & evidence
4. PDF export / sharing
5. Client signature + company branding *(this milestone)*
6. Auth, sync, Free/Pro limits

## License

See [LICENSE](./LICENSE).
