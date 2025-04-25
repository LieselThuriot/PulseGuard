using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace PulseGuard.Infrastructure;

internal sealed class PulseAuthenticationSettings
{
    public required string Authority { get; set; }
    public required string Id { get; set; }
    public required string Secret { get; set; }
    public string? Scopes { get; set; }
    public bool UsePkce { get; set; } = true;
    public string ResponseMode { get; set; } = OpenIdConnectResponseMode.FormPost;
}

internal static class AuthSetup
{
    public static bool ConfigureAuthentication(this IServiceCollection services, ConfigurationManager configuration)
    {
        var settings = configuration.GetSection("Authentication")?.Get<PulseAuthenticationSettings>();

        if (settings is null)
        {
            return false;
        }

        string? pathBase = configuration["PathBase"];
        services.AddAuthorization()
                .AddAuthentication(options =>
                {
                    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
                })
                .AddCookie()
                .AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
                {
                    if (!string.IsNullOrEmpty(pathBase))
                    {
                        options.CallbackPath = pathBase + options.CallbackPath;
                    }

                    options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                    options.Authority = settings.Authority;
                    options.ClientId = settings.Id;
                    options.ClientSecret = settings.Secret;

                    options.ResponseType = OpenIdConnectResponseType.Code;
                    options.UsePkce = settings.UsePkce;

                    options.ResponseMode = settings.ResponseMode;

                    options.MapInboundClaims = false;
                    options.ClaimActions.MapAll();

                    options.TokenValidationParameters.NameClaimType = JwtRegisteredClaimNames.Sub;

                    options.SaveTokens = true;

                    if (settings.Scopes is not null)
                    {
                        foreach (string scope in settings.Scopes.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                        {
                            options.Scope.Add(scope);
                        }
                    }
                });

        return true;
    }
}
