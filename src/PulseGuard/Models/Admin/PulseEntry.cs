namespace PulseGuard.Models.Admin;

public enum PulseEntryType
{
    Normal,
    Agent
}

public sealed record PulseEntry(string Id, PulseEntryType Type, string SubType, string Group, string Name, bool Enabled);