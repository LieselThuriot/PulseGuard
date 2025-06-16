using ProtoBuf;
using PulseGuard.Entities;

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

[ProtoContract(SkipConstructor = true)]
public sealed record PulseDetailResultGroup([property: ProtoMember(1)] string Group, [property: ProtoMember(2)] string Name, [property: ProtoMember(3)] IEnumerable<PulseCheckResultDetail> Items);