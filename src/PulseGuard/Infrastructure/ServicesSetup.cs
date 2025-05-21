using PulseGuard.Services;
using Hosted = PulseGuard.Services.Hosted;

namespace PulseGuard.Infrastructure;

internal static class ServicesSetup
{
    public static void ConfigurePulseServices(this IServiceCollection services)
    {
        services.AddMemoryCache();

        services.AddSingleton<IdService>();
        services.AddSingleton<SignalService>();

        services.AddScoped<PulseStore>();

        services.AddSingleton<AsyncPulseStoreService>();
        services.AddSingleton<WebhookService>();

        PulseEventService eventService = new();
        services.AddSingleton<IPulseEventService>(eventService);
        services.AddSingleton<IPulseRegistrationService>(eventService);

        services.AddHostedService<Hosted.PulseHostedService>();
        services.AddHostedService<Hosted.WebhookHostedService>();
        services.AddHostedService<Hosted.AsyncPulseStoreHostedService>();
    }
}
