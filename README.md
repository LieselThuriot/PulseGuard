# PulseGuard

Lightweight health and telemetry pulse aggregation.

## Concepts Overview

PulseGuard collects two kinds of data:

1. Pulse Checks (synthetic/endpoint health) – single HTTP GET requests executed per configured target.
2. Agent Checks (resource / performance metrics) – queries against external telemetry stores for one or more applications.

Each configuration instance is stored (table storage attributes visible in the code) and executed by hosted background services.

---
## Pulse Check Types
`PulseConfiguration` fields of interest:
- Group / Name: identity / partition.
- Location: target URL (HTTP GET).
- Type: one of the below enum values.
- Timeout / DegrationTimeout: execution & optional degraded-state threshold (ms).
- IgnoreSslErrors: opt-in to bypass certificate validation (flag placed on request options).
- ComparisonValue: auxiliary value used by some check types (JSON / Contains).
- Headers: semicolon separated custom headers (Key:Value;Key:Value).

Result model: `PulseReport(State, Message, Error)` where State ∈ Healthy | Unhealthy | TimedOut.

### 1. HealthApi
Expected response body: JSON matching `HealthApiResponse`:
```
{
  "state": "Healthy | Degraded | Unhealthy | TimedOut | ...",
  "message": "optional",
  "dependencies": [ { "name": "...", "state": "..." }, ... ]
}
```
Processing:
- Body deserialized; extra properties stripped by re-serialization.
- If state == Healthy the raw payload is discarded (saves storage) and report marked Healthy.
- Any deserialization issue -> Fail with original (capped) body.

### 2. StatusCode
Success condition: HTTP status 2xx.
Failure: non-success status. Body (if readable) captured into `Error` for diagnostics.

### 3. Json
Use when you want the target endpoint JSON to contain (as a structural subset) a specific JSON fragment.
- `ComparisonValue` must be valid JSON (subset template).
- Entire response body must be JSON.
- Implementation builds JObjects, computes set intersection and compares.
Fail reasons: empty body, invalid JSON, or subset mismatch.

### 4. Contains
Plain substring presence check on the response body (case-sensitive `string.Contains`).
- `ComparisonValue` is the required substring.
Fail reasons: empty body or substring not found.

### 5. HealthCheck
Simplified textual health probe.
- Expects the body to be exactly a `PulseStates` token (e.g. "Healthy", "Unhealthy", etc.).
- If value parses and is Healthy -> success (body dropped). Otherwise failure with derived message.
Fail reasons: null body or unknown token.

### 6. StatusApi
Expected response body: JSON matching `StatusApiResponse`:
```
{
  "status": "Healthy | ...",
  "details": { /* optional */ },
  "entries": { /* optional */ }
}
```
Processing identical pattern to HealthApi: deserialize, strip extras, evaluate root `status`.
Fail reasons: null body, deserialization error.

### Failure & Timeout Semantics
- Core execution: a single GET request using shared `HttpClient`.
- Timeout & degraded logic (if implemented in hosting layer) will convert to `TimedOut` via `PulseReport.TimedOut`.
- Healthy responses intentionally omit large payload storage for efficiency.

---
## Agent Check Types
`PulseAgentConfiguration` fields:
- Sqid: grouping key.
- Type: one of the AgentCheckType values (string persisted, enum used at runtime).
- Location: endpoint / workspace specific URI or identifier (see per type).
- ApplicationName: logical application (used for correlation & query filtering).
- Headers: optional custom headers (POST queries / data-plane auth if needed).

Result model: `PulseAgentReport(Options, CpuPercentage, Memory, InputOutput)` – null metric values indicate unavailable / failed extraction.

### 1. ApplicationInsights
Purpose: Pull recent (last 10 minutes) CPU, Memory %, IO metrics via the Application Insights Logs API.
Mechanics:
- Issues a POST with a Kusto query against `performanceCounters` selecting the latest minute sample.
- CPU: `% Processor Time Normalized`.
- Memory: calculated as `Private Bytes / Available Bytes * 100`.
- IO: `IO Data Bytes/sec`.
- LargerThanZero helper nulls non-positive results.
Failure Modes:
- Null / unreadable response.
- JSON deserialization issues (response must map to `ApplicationInsightsQueryResponse`).
- Empty tables / rows.
On failure returns `PulseAgentReport.Fail` (all metrics null) per configuration.

Configuration Notes:
- `Location` must be the Application Insights query endpoint (e.g. `https://api.applicationinsights.io/v1/apps/{appId}/query`).
- Provide required API key header (e.g. `x-api-key:{key}`) in `Headers` or use an injected auth handler.

### 2. LogAnalyticsWorkspace
Purpose: Query a Log Analytics workspace for multiple applications at once.
Mechanics:
- Builds a dynamic Kusto query over `AppPerformanceCounters` for all configured `ApplicationName` values.
- Workspace Id taken from first configuration's `Location`.
- Uses `DefaultAzureCredential` and `LogsQueryClient` (Managed Identity / VS / Azure CLI chain).
- Produces a row per application with CPU, Memory %, IO (same calculations as above) and maps back to the correct configuration by `AppRoleName`.
Failure Modes:
- Exception during auth/query (logged as warning).
- No tables / rows returned.
Returns a collection of `PulseAgentReport` or `Fail` list when unsuccessful.

Configuration Notes:
- `Location` must be the Workspace Id (GUID string).
- Ensure the executing environment identity has `Log Analytics Reader` on the workspace.

### 3. WebAppDeployment
Purpose: Monitor Azure Web App deployment history and status.
Mechanics:
- Queries Azure App Service deployment records via ARM API using `ArmClient`.
- Retrieves deployments within a 2-hour rolling window.
- Extracts deployment metadata: author, status (NotDeployed / InProgress / Succeeded / PartiallySucceeded / Failed), start/end times.
- Attempts to enrich deployment data with commit ID, build number, and deployment type from deployment message JSON.
- Returns `DeploymentAgentReport` per deployment containing timestamp, status, and optional enrichments.
Failure Modes:
- Web App resource not found (logged as error).
- Missing or incomplete deployment data (skipped).
- Deserialization failures on deployment message (logged as warning, enrichments omitted).

Configuration Notes:
- `SubscriptionId` must contain the Azure subscription ID.
- `Location` must be the resource group name.
- `ApplicationName` must be the Web App name.
- Ensure the executing environment identity has `Reader` role on the Web App resource.

### 4. DevOpsDeployment
Purpose: Monitor Azure DevOps environment deployment records.
Mechanics:
- Queries Azure DevOps Distributed Task API for environment deployment records within a 2-hour rolling window.
- Filters by `BuildDefinitionId` to track specific pipeline deployments.
- Enriches deployment data by calling the Builds API to retrieve author, commit ID, and build number.
- Returns `DeploymentAgentReport` per deployment with result status, timestamps, and metadata.
Failure Modes:
- API call failures (non-success status codes logged as errors).
- Missing deployment or build data (skipped or partial data returned).
- Deserialization failures (logged as errors).

Configuration Notes:
- `Location` must be the Azure DevOps project name.
- `ApplicationName` must be the team name.
- `SubscriptionId` must be the environment ID (numeric).
- `BuildDefinitionId` must be set to filter deployments by pipeline.
- Provide Personal Access Token (PAT) with `Read` access to Environments, Deployments, and Builds in `Headers` (e.g., `Authorization:Basic <base64-encoded-PAT>`).

---
## Webhooks
Webhooks allow external systems to be notified when pulse events occur.

`Webhook` entity fields:
- Id: unique identifier.
- Secret: authentication token for the webhook endpoint.
- Group / Name: filters which pulses trigger this webhook.
- Location: target URL to POST notifications.
- Enabled: activation flag.
- Type: one of `WebhookType` values (All / StateChange / ThresholdBreach).

### Webhook Types
1. **All**: Triggered for any webhook type.
2. **StateChange**: Triggered only when pulse state transitions (Healthy ↔ Unhealthy).
3. **ThresholdBreach**: Triggered when consecutive failures reach the configured `AlertThreshold`.

### Alert Threshold
The `AlertThreshold` (configured in `PulseOptions`) defines the number of consecutive unhealthy pulse results that trigger a critical alert and webhook notification for `ThresholdBreach` webhooks.
- When a pulse fails, its failure counter (`PulseCounter.Value`) increments.
- When `Value` equals `AlertThreshold`, a critical log event is emitted and webhooks of type `ThresholdBreach` are invoked.
- The webhook payload includes the pulse configuration, failure count, and timestamp of the first failure in the sequence.
- Use this to implement escalation policies or integrate with incident management systems.

Configuration Example:
```json
{
  "Pulse": {
    "AlertThreshold": 3
  }
}
```

---
## Headers Format
Both configuration types serialize headers as: `Name:Value;Another-Header:OtherValue` (no trailing semicolon). They are added with `TryAddWithoutValidation`.

---
## Adding New Pulse Check Types
1. Extend `PulseCheckType` enum & fast string helper.
2. Implement a subclass of `PulseCheck` overriding `CreateReport`.
3. Register it inside `PulseCheckFactory` switch.
4. Handle any serialization context updates if new models are introduced.

## Adding New Agent Check Types
1. Extend `AgentCheckType` enum & fast string helper.
2. Implement an `AgentCheck` subclass returning `IReadOnlyList<PulseAgentReport>`.
3. Add case to `AgentCheckFactory`.
4. Define configuration expectations (Location meaning, required headers / auth).

---
## Error Handling Philosophy
- Fail fast with clear diagnostic message.
- Log deserialization and transport issues with category-specific event ids.
- Avoid storing large healthy payloads to reduce storage cost.

---
## Security & Networking
- Optional SSL ignore flag for scenarios with self-signed certs (use sparingly in production).
- Auth to external telemetry (AI / Log Analytics) is supplied via headers (API key) or `DefaultAzureCredential`.

---
## Sample JSON Subset (Json Check)
ComparisonValue:
```
{"status":"ok","version":"1.0"}
```
Target response may contain superset:
```
{"status":"ok","version":"1.0","uptime":12345,"extra":"ignored"}
```
Check passes because comparison subset matches intersection.

---
## Minimal Configuration Examples
PulseConfiguration (StatusCode):
```
Group=Core
Name=Homepage
Location=https://example.com/
Type=StatusCode
Timeout=5000
Enabled=true
Headers=User-Agent:PulseGuard
```
PulseAgentConfiguration (ApplicationInsights):
```
Sqid=cluster-a
Type=ApplicationInsights
Location=https://api.applicationinsights.io/v1/apps/<appId>/query
ApplicationName=api-service-a
Enabled=true
Headers=x-api-key:XXXX
```
PulseAgentConfiguration (WebAppDeployment):
```
Sqid=web-deployments
Type=WebAppDeployment
SubscriptionId=<subscription-id>
Location=my-resource-group
ApplicationName=my-web-app
Enabled=true
```
PulseAgentConfiguration (DevOpsDeployment):
```
Sqid=pipeline-deployments
Type=DevOpsDeployment
Location=MyProject
ApplicationName=MyTeam
SubscriptionId=123
BuildDefinitionId=456
Enabled=true
Headers=Authorization:Basic <base64-encoded-PAT>
```

---
## Extensibility Notes
- Factories isolate enum → implementation mapping; missing mapping yields `ArgumentOutOfRangeException` ensuring misconfiguration surfaces early.
- Fast string helpers provide O(1) enum parsing without reflection; keep them updated when extending.