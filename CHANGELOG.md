# Changelog

All notable changes to PulseGuard are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

> Adds a new aggregated health query API and refines the overview and dashboard experience, alongside dependency vulnerability fixes.

### Added

- Added a health query route that returns an aggregated, simplified health view for a list of check IDs.
- Added incident filtering to the overview page so operators can narrow the view to affected checks.
- Synced the overview heatmap selection to the URL so a specific view can be shared and restored.

### Changed

- Replaced the pulse detail "Since" metric with a "Slowest" metric on the dashboard.
- Migrated the Views V3 test runner from Jest to Vitest and Angular's unit-test builder.

### Fixed

- Fixed history bar accuracy on the pulse detail view, with added uptime and chart-logic test coverage.

### Dependencies

- Resolved package vulnerabilities by upgrading backend NuGet dependencies and Angular (Views V3) npm packages.
- Replaced Jest testing dependencies with Vitest, jsdom, and Vitest coverage tooling in Views V3.

### Removed

- Removed the Jest configuration, setup file, and Jest-specific test dependencies from Views V3.

---

## [views-v3] — 2026-06-26

> A ground-up Angular single-page frontend (Views V3) replaces the legacy V1/V2 views, adding an overview dashboard, D3-based charts, heatmaps, live pulse streaming, theming, and a fully componentized admin, all upgraded to Angular 22.

### Added

- Introduced a brand-new Angular single-page application (Views V3) covering dashboard, pulse-detail, admin, and auth flows, replacing the legacy static views.
- Added a new Overview page with a live refresh indicator, compact display mode, and time-ago rendering for at-a-glance status across pulses.
- Added a D3.js-powered response chart alongside the metrics chart, with configurable decimation and percentile controls and extended overlay rendering.
- Added interactive heatmaps with rich hover tooltips and a shared uptime utility to visualize pulse history over time, backed by new heatmap data support in the backend.
- Added a history timeline bar and a subtle status-badge variant, plus badge tooltips on the log overview.
- Added Matrix and Synthwave visual themes selectable from the navbar, backed by a dedicated theme service.
- Added an automatic version check that detects a new frontend build and prompts the user to reload, including graceful chunk-load error handling.
- Componentized the admin area into dedicated agent, pulse, webhook, credential, and user list/editor components, with reusable header-editor and string-list-editor controls.
- Added an extensive Jest test suite across components, services, guards, interceptors, and chart logic.

### Changed

- Refactored large dashboard components into smaller units and extracted shared chart rendering, utility, and styling modules for maintainability.
- Improved mobile responsiveness and small-screen behavior for the health bar, controls, navbar, and dashboard layouts.
- Standardized admin editor layouts and credential selection, renamed the webhook `isEnabled` field to `enabled`, and improved editor back-navigation and routing.
- Enhanced accessibility and performance across dashboard components and refined tree selection color, default decimation, and percentile settings.
- Optimized scrollbar styling and embedded self-hosted Nunito, Oxanium, and Share Tech Mono fonts.
- Adopted Angular `@let` bindings for signals reused within templates.

### Fixed

- Fixed pulse, agent, and webhook creation bugs and corrected loading of the agent editor and its credentials.
- Fixed agent header validation across DevOps deployment/release and Web App deployment agents and corrected the agent label.
- Fixed chart zooming, margins, forecast data loading, graph re-rendering on decimation/percentile changes, and assorted chart and input-field rendering issues.
- Fixed navbar rendering in the Matrix theme and removed awkward growth of the pulse graph.

### Removed

- Removed the obsolete Views V1 and Views V2 projects, their assets, and associated backend routes.
- Removed a redundant startup migration from the backend.

### Security

- Rejected unknown users at authentication when user upserting is disabled.

### Performance

- Optimized HTTP cache headers on backend routes.
- Resolved the last fresh blob at startup instead of downloading the full archive.

### Dependencies

- Upgraded the frontend to Angular 22 and bumped the .NET SDK version.
- Migrated protobuf handling from `protobufjs` to `@protobuf-ts/runtime`.
- Applied multiple rounds of .NET (`Directory.Packages.props`) and npm package upgrades.

---

## [credentialmanagement] — 2026-03-06

> Introduced first-class credential management with OAuth2/API-key/basic auth types, encrypted secret storage, and a dedicated admin credential editor.

### Added

- Added reusable client credential management, letting pulse checks, agent checks, and webhooks authenticate to protected endpoints using shared credentials configured through a new admin credential editor.
- Added multiple credential types (OAuth2 client credentials, API key, and basic auth) via a new `CredentialType` model and dedicated credential entities.
- Added merging of archived results into the API so historical and live pulse data are returned together.

### Security

- Added an `EncryptionService` to encrypt stored credential secrets at rest instead of persisting them in plain text.

### Changed

- Consolidated credential handling behind a shared `IHaveCredentials` abstraction across pulses, agents, and webhooks for consistent auth configuration.
- Renamed `TokenService` to `OAuth2CredentialsService` and reworked credential settings to align with the new credential-type model.
- Rewrote the Azure DevOps release agent for improved robustness.
- Excluded internal auth token requests from pulse and agent timing measurements so latency metrics reflect only the monitored endpoints.

### Performance

- Enabled HTTP response compression on the API.
- Precompiled the Protobuf serializers for pulse and agent check result entities.
- Removed a redundant duplicate GET operation in the proto pulse routes.

### Fixed

- Fixed lock release handling in `AuthService` to ensure the lock is always released.
- Fixed an incorrect admin icon in the Views frontend.

### Dependencies

- Upgraded Application Insights telemetry to version 3.0.
- Applied routine NuGet package updates across the solution.

---

## [fluent] — 2026-01-20

> Migrated Azure Table Storage persistence to the Fluent Tables library and modernized the build/solution tooling.

### Changed

- Reworked Azure Table Storage persistence to use Fluent Tables, updating all table entities (`PulseContext`, `PulseCounter`, `UniqueIdentifier`, `User`), the pulse store, auth setup, app startup, and the event/admin/pulse/badge/health/proto route handlers to the new API.
- Raised the default alert threshold to 5 across the pulse options and pulse store.
- Migrated the solution from the legacy `.sln` format to the new XML-based `.slnx` format.

### Dependencies

- Upgraded backend NuGet packages, including the Table Storage dependencies pulled in by the Fluent Tables migration, and refreshed the Views and Views.V2 frontend project package references.

---

## [sse] — 2025-12-05

> Replaced the WebSocket live-event transport with Server-Sent Events and hardened the HTTP responses with a Content Security Policy.

### Changed

- Replaced the WebSocket-based live event channel with Server-Sent Events (SSE), reworking `EventRoutes` and switching the frontend client from `index.ws.js` to `index.sse.js`.
- Filtered the SSE initial-state payload so clients receive only the relevant events when a stream connects.
- Refactored the minimal-API route registrations (Admin, Badge, Event, Health, ProtoPulse, Pulse) and the serializer context to the new extension-method syntax.

### Security

- Added a Content Security Policy (CSP) response header to the API routes.

### Removed

- Removed the `WebSocketRoutes` handler and its server-side wiring in favor of SSE.

### Dependencies

- Updated NuGet package references in `Directory.Packages.props` as part of the SSE migration.

---

## [source-gen-logging] — 2025-11-23

> Migrated all logging to compile-time source-generated log methods for lower-overhead, strongly-typed diagnostics across the entire service.

### Changed

- Converted logging throughout the service to source-generated `LoggerMessage` methods, organized into per-subsystem partial classes (`PulseEvents.Agents`, `.Checks`, `.HostedServices`, `.Routes`, `.Store`, `.Webhooks`) covering pulse checks, agent checks, hosted background services, minimal-API routes, the pulse store, and webhook delivery.
- Replaced the hand-maintained `PulseEventIds` constants with the new source-generated `PulseEvents` logging definitions, updating all agent, check, route, store, hosted-service, and webhook call sites accordingly.

### Performance

- Adopted compile-time source-generated logging to eliminate runtime message formatting and boxing overhead on the service's hot logging paths.

---

## [threshold-webhooks] — 2025-11-23

> Introduced threshold-breach webhook alerting alongside strongly-typed, polymorphic webhook events, plus a .NET 10 upgrade and a round of reliability fixes.

### Added

- Added threshold-breach alerting that fires webhooks when pulse counters cross configured alert thresholds, backed by a new `PulseCounter` entity and threshold options.
- Added a dedicated webhook editor view to the admin UI; admin editors now surface which item is currently being edited.

### Changed

- Reworked webhook events into strongly-typed, polymorphic payloads with explicit event types, simplifying the webhook hosted service and dispatch logic.
- Streamlined the webhook admin models and routes (creation, update, and entry requests) to align with the new typed webhook events.

### Fixed

- Made webhook processing fail silently on deserialization errors and log the offending request bodies for diagnosis.
- Fixed eager blob archiving so archiving no longer runs prematurely.
- Fixed pulse counting logic across the pulse store and related routes.
- Prevented an unwanted redirect on WebSocket connections in the frontend live-event stream.

### Removed

- Removed the MagicConstants source-generator project and its associated build tooling.

### Dependencies

- Upgraded the backend to .NET 10 and consolidated package references accordingly.

---

## [deployments] — 2025-11-23

> Introduced deployment-monitoring agents for Azure Web App and Azure DevOps, with heatmap deployment markers and admin configuration.

### Added

- Added an Azure DevOps Deployment agent that tracks deployment activity, backed by a new `DeploymentResult` entity and agent check type.
- Added a DevOps Release agent for monitoring Azure DevOps release pipelines.
- Added an Azure Web App Deployment agent for tracking web app deployments.
- Added a build ID filter to the DevOps Deployment agent so shared environments can be scoped to specific builds, plus guidance about the required PAT token.
- Surfaced deployments on the heatmap as white dots with hover tooltips, and rendered a single consolidated deploy line for near-instant deployments.
- Extended the admin agent-editor UI to create and configure the new deployment and release agent types.

### Changed

- Narrowed the check windows used by the DevOps and Web App deployment agents.

### Fixed

- Handled ongoing deployments whose end time is still null so in-progress deployments report correctly.

### Performance

- Optimized the DevOps Deployment agent's data collection and configuration handling.

### Dependencies

- Added and updated NuGet package references in `Directory.Packages.props` for the new deployment agents.

---

## [admin-responses] — 2025-11-07

> Admin edit routes now return proper conflict responses for concurrent modifications.

### Changed

- Reworked admin routes (agent, pulse, user, and webhook editors) to return HTTP conflict responses when concurrent modifications are detected, with the corresponding editor UIs updated to handle the new conflict states.

---

## [forecasting] — 2025-10-30

> Introduced client-side forecasting for pulse trends alongside script consolidation and error-handling refinements in the V2 frontend.

### Added

- Added a forecasting feature to the V2 dashboard, with a dedicated forecasting engine (`index.forecast.js`) wired into the detail view to project pulse trends.
- Added the missing Popper dependency to the admin editors (agent, pulse, user, webhook) and the main index so tooltip and dropdown positioning works correctly.

### Changed

- Consolidated and reorganized script includes across the admin editors and main index page for cleaner, more consistent asset loading.

### Fixed

- Suppressed spurious error display when in-flight requests are aborted in the detail view.
- Corrected a boolean check in the backend request handling (`Program.cs`).

---

## [admin] — 2025-10-27

> Introduced a full web-based administration console for managing pulse checks, agents, webhooks, and users, backed by new admin API routes and authentication.

### Added

- Added administration screens with backing admin API routes for creating, updating, and deleting pulse checks and agent checks directly from the UI.
- Added webhook management, letting operators configure webhook endpoints and their trigger conditions through dedicated editor screens.
- Added user management with create, update, rename, and delete support, including optional roles per user.
- Added user display names and a last-visited timestamp shown in the admin user list.
- Organized the admin console into a tabbed view separating pulses, agents, webhooks, and users.
- Added sortable admin listings.
- Added diagnostic logging across the admin routes.
- Documented setup and usage in an expanded README.

### Changed

- Refactored the admin frontend from monolithic scripts into per-entity editor modules (pulse, agent, webhook, user) with shared common logic, cutting overall code size substantially.
- Consolidated the editor action buttons and user-management logic into shared, reusable components.

### Fixed

- Fixed a blob-handling issue in the pulse store persistence layer.
- Added a null check when resolving users during authentication setup.

### Security

- Added an authenticated admin login flow with redirects gating access to the administration console.

### Dependencies

- Upgraded backend NuGet package dependencies.

---

## [agents] — 2025-08-28

> Introduced Agent Checks — resource and performance metric monitoring via Application Insights and Log Analytics Workspace, with CPU, memory, and IO graphs in the frontend.

### Added

- Introduced Agent Checks, a new monitoring type that collects resource and performance metrics alongside existing pulse checks, backed by new agent configuration, check-result entities, and blob-backed storage.
- Added an Application Insights agent for querying application resource and performance metrics.
- Added a Log Analytics Workspace agent for querying resource and performance metrics via Kusto.
- Added agent metric views to the dashboard details screen, including CPU and memory graphs and dedicated IO tracking with distinct coloring.
- Enabled bulk agent execution so a single agent can serve multiple services and share a single location, reducing redundant queries.

### Changed

- Reworked `UniqueIdentifier` handling to drive consistent store name generation across routes, WebSocket/event streaming, and the pulse store.
- Switched pulse store writes to replace-on-update semantics.
- Standardized blob timestamp storage and serialization for agent and pulse check results.

### Fixed

- Corrected metric timestamp mapping so CPU, memory, and IO graphs render gaps accurately and align data points correctly.
- Fixed the Log Analytics Workspace query to filter on time before the app role name and to use the query time range correctly.
- Stopped projecting the timestamp for Application Insights queries to avoid incorrect metric mapping.
- Fixed a null reference in the pulse hosted background service.

### Dependencies

- Added the Azure Monitor / Log Analytics query package required by the new Log Analytics Workspace agent.

---

## [live-events] — 2025-08-13

> Introduced real-time live event streaming over Server-Sent Events and WebSockets, backed by health badge and date-range enhancements in the V2 frontend.

### Added

- Added a live event stream backend exposing real-time pulse updates through new event routes and a dedicated `PulseEventService`, with supporting event models and serializer context.
- Added WebSocket support with a new `WebSocketRoutes` endpoint and a live view in the V2 frontend for streaming pulse state as it changes.
- Added additional WebSocket entry points so live updates can be consumed from more views/contexts.
- Added health badges to the V2 dashboard with color-intensity styling to convey status severity at a glance.
- Added prefilled date ranges to the V2 detail/overview views for quicker time-window selection.

### Changed

- Improved live-view error handling in the frontend to surface a toast and dismiss the offcanvas panel when a connection error occurs.

### Fixed

- Fixed WebSocket group names containing dots that were rejected by some reverse proxies.
- Fixed WebSocket inputs to be URI-component encoded before use.

### Dependencies

- Upgraded NuGet package dependencies in `Directory.Packages.props`.

---

## [proto] — 2025-06-23

> Introduced Protobuf-encoded pulse responses end-to-end, with a decoupled Table Storage layer and streaming async result handling.

### Added

- Added Protobuf-encoded pulse responses with dedicated proto pulse routes and a shared `ProtoResult` type, plus client-side Protobuf decoding in the Views V2 dashboard.
- Added streaming pulse retrieval using `IAsyncEnumerable` across the async pulse store and webhook services.

### Changed

- Decoupled Azure Table Storage into its own layer, simplifying pulse route and entity persistence wiring.
- Slimmed down pulse and webhook models (`PulseEvent`, `PulseOverview`, `PulseReport`, `WebhookEvent`) and their serialization to support the new Protobuf pipeline.

### Security

- Added authentication setup wiring (`AuthSetup`) applied to the pulse routes.

### Dependencies

- Adopted Microsoft's `System.Linq.AsyncEnumerable` library for asynchronous streaming.
- Realigned Table Storage and related package references in `Directory.Packages.props`.

---

## [heatmaps-canvas] — 2025-06-16

> Re-implemented the V2 dashboard heatmap on an HTML canvas for faster, more scalable rendering, with fixes for large datasets, tooltips, and UTC dates.

### Added

- Re-implemented the pulse history heatmap using HTML canvas rendering in the V2 Views dashboard, replacing the prior DOM-based approach for better performance and scalability.
- Added a loading spinner while the heatmap data is being fetched and drawn.

### Fixed

- Fixed a crash when computing min/max values over very large history arrays.
- Corrected UTC date handling in the canvas heatmap so timestamps render accurately.
- Fixed heatmap tooltip positioning when the view is scrolled.

### Performance

- Optimized min/max computation in the heatmap details rendering.

### Dependencies

- Upgraded backend NuGet packages via `Directory.Packages.props`.

---

## [heatmaps] — 2025-06-03

> Introduced heatmap visualizations in the V2 detail view for at-a-glance pulse history, with layout refinements.

### Added

- Added heatmap visualizations to the V2 pulse detail view, rendering health history at a glance via a substantially expanded detail renderer and supporting styles.

### Changed

- Reworked and refined the heatmap rendering and styling for clearer, more accurate visualization.
- Set the page title to include the maintainer's name in the V2 header.

### Fixed

- Corrected the positioning of the filter dropdown in the V2 overview.

---

## [views-v2] — 2025-05-20

> Introduced offcanvas panels in the V2 frontend alongside tidied-up NuGet package management.

### Added

- Added offcanvas slide-out panels to the V2 Views frontend, reworking the index page layout and detail rendering to surface pulse details in a dedicated panel.

### Changed

- Restructured the V2 index HTML and details/index JavaScript to support the new offcanvas-based detail view, with accompanying stylesheet adjustments.

### Dependencies

- Reworked central NuGet package management in `Directory.Packages.props` and pruned `Directory.Build.props`.
- Added a `nuget.config` to pin package sources.

---

## [auth] — 2025-05-10

> Introduced optional OIDC authentication with reverse-proxy-aware request handling, alongside richer detail-view charts and linking.

### Added

- Added optional OIDC authentication with cookie-based sessions, protecting badge, health, and pulse routes when enabled.
- Added per-user telemetry capture on authorized requests.
- Added chart overlays, multi-chart rendering improvements, and preparation for multiple charts on the detail view.
- Added deep-linking support via additional URL parameters and the ability to center a specific bucket on the timeline.
- Added a toast notification when loading of primary detail-view data fails.

### Changed

- Promoted the new Views (v-next) project to the default frontend, replacing the previous default routing.
- Configured forwarded-headers handling to run first and only when authorized, clearing known networks/proxies so PulseGuard works correctly behind a reverse proxy.
- Set explicit authentication cookie options and disabled view caching that interfered with OIDC.
- Improved background hosted services (pulse store, webhooks, pulse execution) and refactored pulse check result handling.
- Added cache-busting timestamps to static file references and tuned view caching.

### Fixed

- Stopped logging append failures in the pulse store as errors.
- Updated frontend fetch paths after the view routing swap.

---

## [timedout] — 2025-04-16

> Introduced a dedicated TimedOut pulse state and an asynchronous storage pipeline, alongside overview health filtering and numerous UI polish and logging improvements.

### Added

- Introduced a distinct `TimedOut` pulse state so timeouts are surfaced separately instead of being lumped into Unhealthy, complete with its own clock icon, badge color, and state styling.
- Added a health filter to the overview screen that lets operators narrow displayed pulses by health status, with groupings automatically expanding and collapsing as the filter changes.
- Added an asynchronous pulse storage pipeline (`AsyncPulseStoreService` plus a dedicated hosted background service and Protobuf serialization) that offloads report and webhook-event persistence via a queue.
- Added a volatility indicator to the pulse details view.
- Added time fields to the pulse details and overview views.

### Changed

- Refreshed the overview with improved color schemes and icons, and reordered state history so the newest state appears first.
- Polished the UI with nicer status badges, Bootstrap icons, and improved toast colors in the log view.
- Extended logging for health contracts with more robust enum parsing, and split `SocketException`s into their own log path.
- Switched queue messages to use their creation time and corrected logging event IDs in the async store service.

### Fixed

- Fixed missing measurements not rendering correctly on the details graph.
- Fixed tooltip parsing (`title` vs. `data-bs-title`) and improved tooltip alignment and wrapping in the log view.
- Fixed a boolean check in the `HealthCheck` pulse check.

### Dependencies

- Upgraded packages in `Directory.Packages.props`, enabling Table Storage to download data using parallel requests for faster retrieval.

---

## [archive] — 2025-04-04

> Introduced Protobuf-based archival of older pulse check results into consolidated Block Blobs, alongside percentile stats and quick range filtering in the frontend.

### Added

- Added Protobuf-based archival of pulse check results, introducing a dedicated `ArchivedPulseCheckResult` entity and extending the blob serializer to persist archived data compactly.
- Merged older pulse check results into a single Block Blob to consolidate historical data storage.
- Added percentile statistics to the pulse detail view.
- Added quick range filtering to the pulse detail view.

### Changed

- Reworked V2 frontend theming and iconography across the index and detail views.
- Serialized pulse states using invariant culture for consistent output.
- Indented pulses rather than their names in the index view for clearer hierarchy.
- Excluded view routes from the Scalar API documentation surface.

### Fixed

- Fixed the partition key used for `PulseCheckResult` entities.
- Prevented the badge and log button from wrapping in the detail view.

### Dependencies

- Added Protobuf serialization package support for the new archival pipeline.

---

## [dashboard] — 2025-03-28

> A new V2 dashboard frontend with interactive response-time charts, a log view, and time-range pickers, backed by two-week AppendBlob history and faster serialization.

### Added

- Introduced the new `PulseGuard.Views.V2` frontend, split off from the experimental v-next views into its own project and wired up via a dedicated route.
- Added interactive response-time and state charts to the pulse detail view, including zoom, ctrl-based panning, and configurable zoom limits.
- Added a from/to date-range picker for scoping the detail charts to arbitrary time windows.
- Added a log canvas view that renders per-pulse history and fills in missing data entries for gaps.
- Added AppendBlob-backed persistence of the last two weeks of response times and states, with dedicated `Pulse`, `PulseCheckResult`, `PulseConfiguration`, and `Webhook` entities.
- Added a loading spinner and a start-time display to the detail view.
- Exposed API documentation via OpenAPI and Scalar.
- Refreshed application branding with new icons and favicon.

### Changed

- Reworked layout and sizing for mobile responsiveness, including offcanvas width, pulse entry heights, scroll bars, and full-screen fill behavior.
- Persisted request timeouts as their actual duration values instead of recording them as 0.
- Added an extra bucket on state changes so transitions render more accurately in charts.

### Fixed

- Fixed chart overflow and graph rendering when checks respond slowly.
- Displayed `0%` instead of `NaN` when a metric could not be computed.
- Handled fetch aborts cleanly when requests are cancelled.
- Restricted tooltip hiding to large screens only.
- Fixed blob appending logic.

### Performance

- Switched blob deserialization to Span-based parsing instead of splitting strings, and applied broader serialization and general performance improvements.
- Filtered pulses by Id before download to support partition/row-key logic not expressible via tags, reducing data pulled.
- Reduced work by iterating pulses only once when processing state changes.
- Applied chart data decimation to keep large time-series responsive.

### Dependencies

- Bumped centrally managed package versions in `Directory.Packages.props` and added OpenAPI/Scalar packages.

---

## [core] — 2025-03-05

> Foundational release establishing the PulseGuard health-monitoring service — synthetic pulse checks, webhook delivery, Azure Table Storage persistence, and the initial web frontend.

### Added

- Introduced the core pulse-check engine with a pluggable `PulseCheckFactory` supporting `HealthApi`, `StatusCode`, `Json`, `Contains`, and `HealthCheck` endpoint checks.
- Added a new `StatusApi` pulse check type for probing status-endpoint responses, with a dedicated `StatusApiResponse` model and serializer support.
- Added hosted background services that periodically run pulse checks (`PulseHostedService`) and dispatch queued webhooks (`WebhookHostedService`).
- Added webhook delivery via `WebhookService` with a `WebhookEvent` model for notifying external consumers of pulse results.
- Added minimal-API routes for pulse data, health, and status badges (`PulseRoutes`, `HealthRoutes`, `BadgeRoutes`).
- Persisted pulse state and reports to Azure Table Storage through `PulseContext` and `PulseStore`.
- Added the Views frontend project with a dashboard index page, per-check detail views, and single/group chart pages plus supporting icons and assets.
- Added the MagicConstants source generator project to generate constants at build time.
- Included ARM deployment templates for Application Insights, hosting profile, and storage provisioning.

### Changed

- Added HTTP response headers and enabled static-asset minification, with related MagicConstants generator enhancements.
- Consolidated route registration into a shared Routes definition and streamlined Program startup.

### Performance

- Maintained a duplicated copy of recent pulse records to speed up reads of recent history.

### Dependencies

- Upgraded NuGet packages and build configuration across multiple passes, including MagicConstants and Views project tooling updates.

---

[Unreleased]: https://github.com/LieselThuriot/PulseGuard/compare/views-v3...HEAD
[views-v3]: https://github.com/LieselThuriot/PulseGuard/compare/credentialmanagement...views-v3
[credentialmanagement]: https://github.com/LieselThuriot/PulseGuard/compare/fluent...credentialmanagement
[fluent]: https://github.com/LieselThuriot/PulseGuard/compare/sse...fluent
[sse]: https://github.com/LieselThuriot/PulseGuard/compare/source-gen-logging...sse
[source-gen-logging]: https://github.com/LieselThuriot/PulseGuard/compare/threshold-webhooks...source-gen-logging
[threshold-webhooks]: https://github.com/LieselThuriot/PulseGuard/compare/deployments...threshold-webhooks
[deployments]: https://github.com/LieselThuriot/PulseGuard/compare/admin-responses...deployments
[admin-responses]: https://github.com/LieselThuriot/PulseGuard/compare/forecasting...admin-responses
[forecasting]: https://github.com/LieselThuriot/PulseGuard/compare/admin...forecasting
[admin]: https://github.com/LieselThuriot/PulseGuard/compare/agents...admin
[agents]: https://github.com/LieselThuriot/PulseGuard/compare/live-events...agents
[live-events]: https://github.com/LieselThuriot/PulseGuard/compare/proto...live-events
[proto]: https://github.com/LieselThuriot/PulseGuard/compare/heatmaps-canvas...proto
[heatmaps-canvas]: https://github.com/LieselThuriot/PulseGuard/compare/heatmaps...heatmaps-canvas
[heatmaps]: https://github.com/LieselThuriot/PulseGuard/compare/views-v2...heatmaps
[views-v2]: https://github.com/LieselThuriot/PulseGuard/compare/auth...views-v2
[auth]: https://github.com/LieselThuriot/PulseGuard/compare/timedout...auth
[timedout]: https://github.com/LieselThuriot/PulseGuard/compare/archive...timedout
[archive]: https://github.com/LieselThuriot/PulseGuard/compare/dashboard...archive
[dashboard]: https://github.com/LieselThuriot/PulseGuard/compare/core...dashboard
[core]: https://github.com/LieselThuriot/PulseGuard/commits/core
