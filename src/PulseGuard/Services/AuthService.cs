using PulseGuard.Entities;
using System.Text;

namespace PulseGuard.Services;

public sealed record AuthHeader(string Header, string Value);

public sealed class AuthService(PulseContext context, OAuth2CredentialsService tokenService)
{
    private readonly PulseContext _context = context;
    private readonly OAuth2CredentialsService _tokenService = tokenService;

    public Task<AuthHeader?> GetAsync(PulseAgentConfiguration configuration, CancellationToken token)
        => GetInternalAsync(configuration.GetCredential(), token);

    public Task<AuthHeader?> GetAsync(PulseConfiguration configuration, CancellationToken token)
        => GetInternalAsync(configuration.GetCredential(), token);

    private Task<AuthHeader?> GetInternalAsync((string, string)? credential, CancellationToken token)
    {
        if (credential is not null)
        {
            (string type, string id) = credential.GetValueOrDefault();

            if (type is nameof(OAuth2Credentials))
            {
                return GetClientCredentialsAsync(id, token)!;
            }
            else if (type is nameof(BasicCredentials))
            {
                return GetBasicAuthenticationAsync(id, token)!;
            }
            else if (type is nameof(ApiKeyCredentials))
            {
                return GetApiKeyAuthenticationAsync(id, token)!;
            }
        }

        return Task.FromResult<AuthHeader?>(null);
    }

    private async Task<AuthHeader> GetClientCredentialsAsync(string id, CancellationToken token)
    {
        var result = await _tokenService.GetAsync(id, token);
        return new("Authorization", "Bearer " + result.AccessToken);
    }

    private async Task<AuthHeader> GetBasicAuthenticationAsync(string id, CancellationToken token)
    {
        var credentials = await _context.Credentials.FindBasicCredentialsAsync(id, token)
                                    ?? throw new InvalidOperationException($"Basic Auth credentials with id '{id}' not found");

        string concat = credentials.Username + ':' + credentials.Password;
        byte[] bytes = Encoding.UTF8.GetBytes(concat);
        string authInfo = "Basic " + Convert.ToBase64String(bytes);

        return new("Authorization", authInfo);
    }

    private async Task<AuthHeader> GetApiKeyAuthenticationAsync(string id, CancellationToken token)
    {
        var credentials = await _context.Credentials.FindApiKeyCredentialsAsync(id, token)
                                    ?? throw new InvalidOperationException($"Basic Auth credentials with id '{id}' not found");

        return new(credentials.Header, credentials.ApiKey);
    }
}
