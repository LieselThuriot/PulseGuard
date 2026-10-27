using Azure.Identity;
using Azure.ResourceManager;
using PulseGuard.Services;
using Hosted = PulseGuard.Services.Hosted;

namespace PulseGuard.Infrastructure;

internal static class ServicesSetup
{
    public static void ConfigurePulseServices(this IServiceCollection services)
    {
        services.AddMemoryCache();

        services.AddSingleton<IdService>();

        services.AddScoped<ApiKeyService>();
        services.AddScoped<PulseStore>();
        services.AddScoped<PulseCheckExecutor>();

        services.AddSingleton<WebhookService>();
        services.AddSingleton<CheckJobQueue>();
        services.AddScoped<IntervalClaimService>();

        services.AddSingleton(_ => new ArmClient(new DefaultAzureCredential()));

        PulseEventService eventService = new();
        services.AddSingleton<IPulseEventService>(eventService);
        services.AddSingleton<IPulseRegistrationService>(eventService);

        services.AddSingleton<EncryptionService>();
        services.AddSingleton<OAuth2CredentialsService>();
        services.AddSingleton<AuthService>();

        services.AddHostedService<Hosted.PulseHostedService>();
        services.AddHostedService<Hosted.CheckWorkerHostedService>();
        services.AddHostedService<Hosted.WebhookHostedService>();
        services.AddHostedService<Hosted.PulseEventRefreshHostedService>();
    }
}
