using PulseGuard.Entities;

namespace PulseGuard.Models;

public sealed record PulseOverviewGroup(string Group, IEnumerable<PulseOverviewGroupItem> Items);
public sealed record PulseOverviewGroupItem(string Id, string Name, IEnumerable<PulseOverviewItem> Items);
public sealed record PulseOverviewItem(PulseStates State, string? Message, DateTimeOffset? From, DateTimeOffset? To);
public sealed record PulseDetailGroupItem(string Id, string Name, string? ContinuationToken, IEnumerable<PulseDetailItem> Items);
public sealed record PulseDetailItem(PulseStates State, string? Message, DateTimeOffset? From, DateTimeOffset? To, string? Error);
public sealed record PulseOverviewStateGroup(string Group, IEnumerable<PulseOverviewStateGroupItem> Items);
public sealed record PulseOverviewStateGroupItem(string Id, string Name, IEnumerable<PulseStateItem> Items);
public sealed record PulseStateGroupItem(string Id, string Name, IEnumerable<PulseStateItem> Items);
public sealed record PulseStateItem(PulseStates State, DateTimeOffset? From, DateTimeOffset? To);
public sealed record PulseDetailResultGroup(string Group, string Name, IEnumerable<PulseCheckResultDetail> Items);