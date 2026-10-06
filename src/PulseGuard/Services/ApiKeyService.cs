using System.Security.Cryptography;
using System.Text;

namespace PulseGuard.Services;

public sealed class ApiKeyService
{
    public string ComputeHash(string key) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
    public string Generate() => $"pg_{Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_')}";
    public string GenerateHash() => ComputeHash(Generate());
}