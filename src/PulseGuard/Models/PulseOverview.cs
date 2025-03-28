namespace PulseGuard.Models;

public sealed record PulseOverviewGroup(string Group, IAsyncEnumerable<PulseOverviewGroupItem> Items);
public sealed record PulseOverviewGroupItem(string Id, string Name, IAsyncEnumerable<PulseOverviewItem> Items);
public sealed record PulseOverviewItem(PulseStates State, string? Message, DateTimeOffset? From, DateTimeOffset? To);
public sealed record PulseDetailGroupItem(string Id, string Name, string? ContinuationToken, IAsyncEnumerable<PulseDetailItem> Items);
public sealed record PulseDetailItem(PulseStates State, string? Message, DateTimeOffset? From, DateTimeOffset? To, string? Error);
public sealed record PulseOverviewStateGroup(string Group, IAsyncEnumerable<PulseOverviewStateGroupItem> Items);
public sealed record PulseOverviewStateGroupItem(string Id, string Name, IAsyncEnumerable<PulseStateItem> Items);
public sealed record PulseStateGroupItem(string Id, string Name, IAsyncEnumerable<PulseStateItem> Items);
public sealed record PulseStateItem(PulseStates State, DateTimeOffset? From, DateTimeOffset? To);

public sealed record PulseDetailResultGroup(string Group, string Name, IEnumerable<PulseDetailResult> Items);
public sealed record PulseDetailResult(PulseStates State, DateTimeOffset Timestamp, long? ElapsedMilliseconds);