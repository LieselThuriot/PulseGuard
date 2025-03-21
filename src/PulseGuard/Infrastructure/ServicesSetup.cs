using PulseGuard.Services;
using Hosted = PulseGuard.Services.Hosted;

namespace PulseGuard.Infrastructure;

internal static class ServicesSetup
{
    public static void ConfigurePulseServices(this IServiceCollection services)
    {
        services.AddMemoryCache();

        services.AddSingleton<IdService>();
        services.AddSingleton<WebhookService>();
        services.AddScoped<PulseStore>();

        services.AddHostedService<Hosted.PulseHostedService>();
        services.AddHostedService<Hosted.WebhookHostedService>();
    }
}
