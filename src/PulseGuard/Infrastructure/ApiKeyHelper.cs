using System.Security.Cryptography;
using System.Text;

namespace PulseGuard.Infrastructure;

internal static class ApiKeyHelper
{
    public static string ComputeHash(string key) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
    public static string Generate() => $"pg_{Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_')}";
    public static string GenerateHash() => ComputeHash(Generate());
}
