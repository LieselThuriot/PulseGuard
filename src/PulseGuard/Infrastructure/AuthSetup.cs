using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using PulseGuard.Entities;
using System.Security.Claims;
using TableStorage.Linq;

namespace PulseGuard.Infrastructure;

internal sealed class PulseAuthenticationSettings
{
    public required string Authority { get; set; }
    public required string Id { get; set; }
    public required string Secret { get; set; }
    public string? Scopes { get; set; }
    public bool UsePkce { get; set; } = true;
    public string ResponseMode { get; set; } = default!;
    public string UserIdClaim { get; set; } = default!;
}

internal static class AuthSetup
{
    public const string AdministratorPolicy = "Administrator";

    public static bool ConfigureAuthentication(this IServiceCollection services, ConfigurationManager configuration)
    {
        services.PostConfigure<PulseAuthenticationSettings>(options =>
        {
            if (string.IsNullOrEmpty(options.ResponseMode))
            {
                options.ResponseMode = OpenIdConnectResponseMode.FormPost;
            }

            if (string.IsNullOrEmpty(options.UserIdClaim))
            {
                options.UserIdClaim = JwtRegisteredClaimNames.Sub;
            }
        });

        var settings = configuration.GetSection("Authentication")?.Get<PulseAuthenticationSettings>();

        if (settings is null)
        {
            return false;
        }

        string? pathBase = configuration["PathBase"];
        string accessDeniedPath = pathBase + "/AccessDenied";

        services.AddAuthorization(options => options.AddPolicy(AdministratorPolicy, policy => policy.RequireAuthenticatedUser().RequireRole("Administrator")))
                .AddAuthentication(options =>
                {
                    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
                })
                .AddCookie(options =>
                {
                    options.AccessDeniedPath = accessDeniedPath;
                    options.Cookie.HttpOnly = true;
#if !DEBUG
                    options.Cookie.SameSite = SameSiteMode.Strict;
                    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
#endif
                    if (!string.IsNullOrEmpty(pathBase))
                    {
                        options.Cookie.Path = pathBase;
                    }
                })
                .AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
                {
                    options.AccessDeniedPath = accessDeniedPath;

                    options.AuthenticationMethod = OpenIdConnectRedirectBehavior.FormPost;
                    options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;

                    options.Authority = settings.Authority;
                    options.ClientId = settings.Id;
                    options.ClientSecret = settings.Secret;

                    options.ResponseType = OpenIdConnectResponseType.Code;
                    options.UsePkce = settings.UsePkce;

                    options.ResponseMode = settings.ResponseMode;

                    options.MapInboundClaims = false;
                    options.ClaimActions.MapAll();

                    options.TokenValidationParameters.NameClaimType = settings.UserIdClaim;

                    options.SaveTokens = true;

                    if (settings.Scopes is not null)
                    {
                        foreach (string scope in settings.Scopes.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
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
                        },
                        OnTokenValidated = ctx =>
                        {
                            if (ctx.Principal?.Identity is ClaimsIdentity identity && !string.IsNullOrEmpty(identity.Name))
                            {
                                return Enrich();

                                async Task Enrich()
                                {
                                    PulseContext db = ctx.HttpContext.RequestServices.GetRequiredService<PulseContext>();
                                    User? user = await db.Users.FindAsync(identity.Name, User.RowTypeRoles);

                                    if (user is not null)
                                    {
                                        IEnumerable<Claim> roleClaims = user.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                                                                            .Select(r => new Claim(identity.RoleClaimType, r));

                                        identity.AddClaims(roleClaims);
                                    }
                                }
                            }

                            return Task.CompletedTask;
                        }
                    };
                });

        return true;
    }
}
