using PulseGuard.Entities;

namespace PulseGuard.Services;

public sealed class IdService
{
    private readonly Sqids.SqidsEncoder<ulong> _encoder = new(new()
    {
        MinLength = 6
    });

    public string GetSqid(string group, string name) => _encoder.Encode(CalculateHash($"{group}|{name}"));
    public string GetSqid(PulseConfiguration options) => GetSqid(options.Group, options.Name);

    public string GetRandomSqid()
    {
        unchecked
        {
            uint part1 = (uint)Random.Shared.Next(int.MinValue, int.MaxValue);
            uint part2 = (uint)Random.Shared.Next(int.MinValue, int.MaxValue);
            ulong combined = ((ulong)part1 << 32) | part2;
            return _encoder.Encode(combined);
        }
    }

    private static ulong CalculateHash(string input)
    {
        ulong hashedValue = 3074457345618258791ul;

        for (int i = 0; i < input.Length; i++)
        {
            hashedValue += input[i];
            hashedValue *= 3074457345618258799ul;
        }

        return hashedValue;
    }
}
