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
                .AddCookie(options =>
                {
                    options.Cookie.SameSite = SameSiteMode.Strict;
                    options.Cookie.HttpOnly = true;
                    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;

                    if (!string.IsNullOrEmpty(pathBase))
                    {
                        options.Cookie.Path = pathBase;
                    }
                })
                .AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
                {
                    string accessDenied = "/AccessDenied";
                    if (!string.IsNullOrEmpty(pathBase))
                    {
                        options.CallbackPath = pathBase + options.CallbackPath;
                        accessDenied = pathBase + accessDenied;
                    }

                    options.AccessDeniedPath = accessDenied;

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

                    options.Events = new()
                    {
                        OnRemoteFailure = context =>
                        {
                            context.HandleResponse();
                            context.Response.Redirect(options.AccessDeniedPath);
                            return Task.CompletedTask;
                        }
                    };
                });

        return true;
    }
}
