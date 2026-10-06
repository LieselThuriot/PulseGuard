using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using PulseGuard.Entities;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace PulseGuard.Infrastructure;

internal sealed class ApiKeyAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, PulseContext context)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "CookieOrApiKey";
    private const string HeaderName = "x-api-key";

    private readonly PulseContext _context = context;

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out StringValues headerValues))
        {
            return await Context.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        }

        if (headerValues.Count is not 1)
        {
            return AuthenticateResult.Fail($"The '{HeaderName}' header must contain a single value.");
        }

        string? key = headerValues[0];

        if (string.IsNullOrEmpty(key))
        {
            return AuthenticateResult.Fail("The API key is empty.");
        }

        return await Authenticate(key);
    }

    private async Task<AuthenticateResult> Authenticate(string key)
    {
        PulseApiKey? apiKey = await _context.Settings.FindPulseApiKeyAsync(ApiKeyHelper.ComputeHash(key), Context.RequestAborted);

        if (apiKey is not null && IsValid(apiKey))
        {
            ClaimsIdentity identity = new([new Claim(ClaimTypes.Name, "API key")], SchemeName);
            ClaimsPrincipal principal = new(identity);
            AuthenticationTicket ticket = new(principal, SchemeName);
            return AuthenticateResult.Success(ticket);
        }

        return AuthenticateResult.Fail("The API key is invalid or expired.");
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

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        if (Request.Headers.ContainsKey(HeaderName))
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        }

        return Context.ChallengeAsync(OpenIdConnectDefaults.AuthenticationScheme, properties);
    }

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        return Context.ForbidAsync(CookieAuthenticationDefaults.AuthenticationScheme, properties);
    }
}
