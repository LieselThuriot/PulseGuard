using PulseGuard.Entities;
using System.Collections.Concurrent;

namespace PulseGuard.Services;

public sealed class OAuth2CredentialsService(PulseContext context, IHttpClientFactory httpClientFactory)
{
    private readonly PulseContext _context = context;
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;

    private readonly ConcurrentDictionary<OAuth2Credentials, TokenRequestClient> _clients = new(OAuth2CredentialsComparer.Instance);

    public async Task<ApiAccessToken> GetAsync(string id, CancellationToken token)
    {
        var clientCredentials = await _context.Credentials.FindOAuth2CredentialsAsync(id, token)
                                    ?? throw new InvalidOperationException($"Client credentials with id '{id}' not found");

        var client = _clients.GetOrAdd(clientCredentials, _ => new TokenRequestClient(_httpClientFactory, clientCredentials));
        return await client.GetTokenAsync(token);
    }

    public void Purge(OAuth2Credentials clientCredentials)
    {
        if (_clients.TryRemove(clientCredentials, out TokenRequestClient? client))
        {
            client.Dispose();
        }
    }

    private sealed class TokenRequestClient(IHttpClientFactory httpClientFactory, OAuth2Credentials clientCredentials) : IDisposable
    {
        private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
        private readonly OAuth2Credentials _clientCredentials = clientCredentials;
        private readonly SemaphoreSlim _readLock = new(1, 1);

        private ApiAccessToken? _accessToken;

        public void Dispose()
        {
            _readLock.Dispose();
        }

        public Task<ApiAccessToken> GetTokenAsync(CancellationToken cancellationToken)
        {
            var currentAccessToken = _accessToken;

            if (currentAccessToken?.IsValid() is true)
            {
                return Task.FromResult(currentAccessToken);
            }

            return GetTokenLockedAsync(cancellationToken);
        }

        private async Task<ApiAccessToken> GetTokenLockedAsync(CancellationToken cancellationToken)
        {
            try
            {
                await _readLock.WaitAsync(cancellationToken);

                // Check again, access token might already be refreshed.
                var currentAccessToken = _accessToken;
                if (currentAccessToken?.IsValid() is true)
                {
                    return currentAccessToken;
                }

                return _accessToken = await GetNewTokenAsync(cancellationToken);
            }
            finally
            {
                _readLock.Release();
            }
        }

        private async Task<ApiAccessToken> GetNewTokenAsync(CancellationToken cancellationToken)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, _clientCredentials.TokenEndpoint);

            var form = new List<KeyValuePair<string, string>>(4)
            {
                KeyValuePair.Create("grant_type", "client_credentials"),
                KeyValuePair.Create("client_id", _clientCredentials.ClientId)
            };

            if (!string.IsNullOrWhiteSpace(_clientCredentials.ClientSecret))
            {
                form.Add(KeyValuePair.Create("client_secret", _clientCredentials.ClientSecret));
            }

            if (!string.IsNullOrWhiteSpace(_clientCredentials.Scopes))
            {
                form.Add(KeyValuePair.Create("scope", _clientCredentials.Scopes));
            }

            request.Content = new FormUrlEncodedContent(form);

            var client = _httpClientFactory.CreateClient("TokenRequest");

            var responseMsg = await client.SendAsync(request, cancellationToken);

            if (!responseMsg.IsSuccessStatusCode)
            {
                throw CouldNotGetToken(null);
            }

            string content = await responseMsg.Content.ReadAsStringAsync(cancellationToken);

            var response = System.Text.Json.JsonSerializer.Deserialize<TokenResponse>(content);

            if (response is null || !string.IsNullOrEmpty(response.Error))
            {
                throw CouldNotGetToken(response);
            }

            return new(response.AccessToken!, response.TokenType!, TimeSpan.FromSeconds(response.ExpiresIn.GetValueOrDefault()), DateTime.UtcNow);
        }

        private static Exception CouldNotGetToken(TokenResponse? response)
        {
            if (response is null)
            {
                return new Exception("Token request failed");
            }

            return new Exception(response.ErrorDescription ?? response.Error ?? "Could not request token");
        }
    }

    private sealed class TokenResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("token_type")]
        public string? TokenType { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("expires_in")]
        public int? ExpiresIn { get; set; }
        public string? Error { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("error_description")]
        public string? ErrorDescription { get; set; }
    }
}

public sealed record ApiAccessToken(string AccessToken, string TokenType, TimeSpan ExpiresIn, DateTime Creation)
{
    public bool IsValid() => (Creation + GetExpiration()) > DateTime.UtcNow;
    public TimeSpan GetExpiration() => ExpiresIn - TimeSpan.FromMinutes(1);
}