using Microsoft.Extensions.Caching.Memory;
using PulseGuard.Entities;
using System.Security.Cryptography;
using System.Text;

namespace PulseGuard.Services;

public sealed class ApiKeyService(PulseContext context, IMemoryCache cache)
{
    private static readonly TimeSpan s_cacheDuration = TimeSpan.FromMinutes(1);

    private readonly IMemoryCache _cache = cache;

    public const string KeyPrefix = "pg_";

    public static string ComputeHash(string key) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
    public static string Generate() => $"{KeyPrefix}{Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_')}";

    public static (PulseApiKey ApiKey, string Key) Create(string label, int? validForDays)
    {
        string key = Generate();
        PulseApiKey apiKey = new()
        {
            Id = Guid.CreateVersion7().ToString("N"),
            KeyHash = ComputeHash(key),
            Label = label,
            Created = DateTimeOffset.UtcNow,
            ValidFor = validForDays
        };

        return (apiKey, key);
    }

    public async Task<PulseApiKey?> FindValidAsync(string key, CancellationToken token)
    {
        string keyHash = ComputeHash(key);
        string cacheKey = GetCacheKey(keyHash);

        if (!_cache.TryGetValue(cacheKey, out PulseApiKey? apiKey))
        {
            apiKey = await context.Settings.FindPulseApiKeyAsync(keyHash, token);

            if (apiKey is null || !IsValid(apiKey))
            {
                return null;
            }

            _cache.Set(cacheKey, apiKey, new MemoryCacheEntryOptions
            {
                AbsoluteExpiration = GetCacheExpiration(apiKey)
            });
        }

        if (apiKey is not null && IsValid(apiKey))
        {
            return apiKey;
        }

        _cache.Remove(cacheKey);
        return null;
    }

    public void RemoveFromCache(string keyHash) => _cache.Remove(GetCacheKey(keyHash));

    private static string GetCacheKey(string keyHash) => $"api-key-auth:{keyHash}";

    private static DateTimeOffset GetCacheExpiration(PulseApiKey apiKey)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        DateTimeOffset cacheExpiration = now.Add(s_cacheDuration);

        if (apiKey.ValidFor is int validFor)
        {
            DateTimeOffset keyExpiration = apiKey.Created.AddDays(validFor);
            if (keyExpiration < cacheExpiration)
            {
                cacheExpiration = keyExpiration;
            }
        }

        return cacheExpiration;
    }

    private static bool IsValid(PulseApiKey apiKey)
    {
        if (apiKey.ValidFor is not int validFor)
        {
            return true;
        }

        try
        {
            return DateTimeOffset.UtcNow < apiKey.Created.AddDays(validFor);
        }
        catch (ArgumentOutOfRangeException)
        {
            return false;
        }
    }
}
