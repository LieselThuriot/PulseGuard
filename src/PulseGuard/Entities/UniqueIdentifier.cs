using TableStorage;

namespace PulseGuard.Entities;

[TableSet(RowKey = nameof(Id))]
public sealed partial class UniqueIdentifier
{
    public partial string Id { get; set; }

    public partial string Group { get; set; }
    public partial string Name { get; set; }

    public string GetFullName()
    {
        string result = Name;

        if (!string.IsNullOrWhiteSpace(Group))
        {
            result = $"{Group} > {result}";
        }

        return result;
    }

    public (string? Group, string Name) GetFullNameTuple() => (Group is "" ? null : Group, Name);
}