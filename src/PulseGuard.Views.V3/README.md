# PulseGuard Views V3

Angular 21 frontend for PulseGuard — a health-check monitoring dashboard with real-time streaming, forecasting, and admin configuration management.

## Prerequisites

- Node.js 22+
- npm 11+

## Getting Started

```bash
npm install
npm start
```

The dev server starts at `http://localhost:4200/` with hot reload. The app expects the PulseGuard backend API at the same origin (proxied through the .NET SPA middleware in development).

## Project Structure

```
src/app/
├── components/     # Reusable UI components (health-bar, navbar, toast, etc.)
├── constants.ts    # Shared magic-number constants
├── guards/         # Route guards (admin access)
├── interceptors/   # HTTP error interceptor
├── models/         # TypeScript interfaces and enums
├── pages/
│   ├── admin/      # Configuration editors (pulse, agent, webhook, user, credential)
│   └── dashboard/  # Main dashboard with pulse tree, detail view, and charts
└── services/       # API communication, auth, SSE events, protobuf decoding, theme
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@ng-bootstrap/ng-bootstrap` | Bootstrap 5 Angular components |
| `d3` | Interactive SVG/Canvas charts |
| `@protobuf-ts/runtime` | Binary protobuf response decoding |
| `mathjs` | Forecast statistical calculations |

## Building

```bash
npm run build
```

Output goes to `dist/pulseguard.client/browser/`. Production builds include hashing for cache-busting.

## Architecture Notes

- **Standalone components** — no NgModules; each component declares its own imports.
- **Signal-based state** — Angular signals for reactive state management; no external store library.
- **Lazy loading** — Admin pages and dashboard are lazy-loaded via the router.
- **OnPush change detection** — all components use `ChangeDetectionStrategy.OnPush`.
- **Protobuf binary** — detail, metric, and heatmap endpoints return protobuf; decoded client-side.
- **SSE** — real-time pulse events via `EventSource` for the live dashboard view.
