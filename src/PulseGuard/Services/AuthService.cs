using Microsoft.Extensions.Caching.Memory;
using PulseGuard.Entities;
using System.Text;

namespace PulseGuard.Services;

public sealed record AuthHeader(string Header, string Value)
{
    public void ApplyTo(HttpRequestMessage request) => request.Headers.TryAddWithoutValidation(Header, Value);
}

public sealed class AuthService(PulseContext context, OAuth2CredentialsService tokenService, IMemoryCache cache, EncryptionService encryptionService)
{
    private readonly PulseContext _context = context;
    private readonly OAuth2CredentialsService _tokenService = tokenService;
    private readonly IMemoryCache _cache = cache;
    private readonly EncryptionService _encryptionService = encryptionService;

    private readonly SemaphoreSlim _semaphore = new(1, 1);

    public Task<AuthHeader?> GetAsync<T>(T configuration, CancellationToken token) where T : IHaveCredentials
    {
        var credential = configuration.GetCredential();

        if (credential.HasValue)
        {
            var (credentialType, credentialId) = credential.GetValueOrDefault();
            return GetAsync(credentialType, credentialId, token);
        }
        else
        {
            return Task.FromResult<AuthHeader?>(null);
        }
    }

    public async Task<AuthHeader?> GetAsync(CredentialType type, string id, CancellationToken token)
    {
        string cacheKey = $"auth:{type}:{id}";

        if (_cache.TryGetValue(cacheKey, out AuthHeader? value))
        {
            return value;
        }

        await _semaphore.WaitAsync(token);

        try
        {
            if (!_cache.TryGetValue(cacheKey, out value))
            {
                value = await GetInternalAsync(type, id, token);
                _cache.Set(cacheKey, value, TimeSpan.FromMinutes(1));
            }

            return value;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private Task<AuthHeader?> GetInternalAsync(CredentialType type, string id, CancellationToken token) => type switch
    {
        CredentialType.OAuth2 => GetClientCredentialsAsync(id, token),
        CredentialType.Basic => GetBasicAuthenticationAsync(id, token),
        CredentialType.ApiKey => GetApiKeyAuthenticationAsync(id, token),
        _ => Task.FromResult<AuthHeader?>(null)
    };

    private async Task<AuthHeader?> GetClientCredentialsAsync(string id, CancellationToken token)
    {
        var result = await _tokenService.GetAsync(id, token);
        return new("Authorization", result.TokenType + " " + result.AccessToken);
    }

    private async Task<AuthHeader?> GetBasicAuthenticationAsync(string id, CancellationToken token)
    {
        var credentials = await _context.Credentials.FindBasicCredentialsAsync(id, token)
                                    ?? throw new InvalidOperationException($"Basic Auth credentials with id '{id}' not found");

        string password = _encryptionService.Decrypt(credentials.Password);
        string concat = credentials.Username + ':' + password;
        byte[] bytes = Encoding.UTF8.GetBytes(concat);
        string authInfo = "Basic " + Convert.ToBase64String(bytes);

        return new("Authorization", authInfo);
    }

    private async Task<AuthHeader?> GetApiKeyAuthenticationAsync(string id, CancellationToken token)
    {
        var credentials = await _context.Credentials.FindApiKeyCredentialsAsync(id, token)
                                    ?? throw new InvalidOperationException($"Basic Auth credentials with id '{id}' not found");

        string password = _encryptionService.Decrypt(credentials.ApiKey);
        return new(credentials.Header, password);
    }
}