using Microsoft.Extensions.Options;
using Polly;
using PulseGuard.Checks;
using PulseGuard.Models;
using System.Net.Http.Headers;
using System.Net.Mime;
using System.Net.Sockets;

namespace PulseGuard.Infrastructure;

internal static class HttpClientSetup
{
    private const int MaxConnectionsPerServer = 25;

    public static void ConfigurePulseHttpClients(this IServiceCollection services)
    {
        services.AddHttpClient();

        services.AddHttpClient("Badges", (sp, x) =>
                {
                    x.BaseAddress = new Uri("https://img.shields.io/badge/");
                    x.DefaultRequestHeaders.Accept.Clear();
                    x.DefaultRequestHeaders.Accept.Add(new(MediaTypeNames.Image.Svg));
                    x.DefaultRequestHeaders.CacheControl = new()
                    {
                        Public = true,
                        MaxAge = TimeSpan.FromSeconds(sp.GetRequiredService<IOptions<PulseOptions>>().Value.Interval * 30)
                    };
                })
                .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
                {
                    MaxConnectionsPerServer = MaxConnectionsPerServer
                })
                .AddTransientHttpErrorPolicy(x => x.WaitAndRetryAsync(3, x => TimeSpan.FromMilliseconds(x * 333)));

        services.AddHttpClient("Webhooks", x =>
                {
                    x.DefaultRequestHeaders.SetDefaultHeaders();
                    x.Timeout = TimeSpan.FromSeconds(5);
                })
                .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
                {
                    MaxConnectionsPerServer = MaxConnectionsPerServer
                })
                .AddTransientHttpErrorPolicy(x => x.WaitAndRetryAsync(3, x => TimeSpan.FromSeconds(x)));

        services.AddHttpClient<PulseCheckFactory>(x => x.DefaultRequestHeaders.SetDefaultHeaders())
                .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
                {
                    MaxConnectionsPerServer = MaxConnectionsPerServer,
                    ClientCertificateOptions = ClientCertificateOption.Manual,
                    ServerCertificateCustomValidationCallback = (httpRequestMessage, _, _, policyErrors) =>
                    {
                        if (policyErrors is System.Net.Security.SslPolicyErrors.None)
                        {
                            return true;
                        }

                        IReadOnlyDictionary<string, object?> options = httpRequestMessage.Options;
                        return options.ContainsKey("IgnoreSslErrors");
                    }
                })
                .AddPolicyHandler(
                    Policy<HttpResponseMessage>.Handle<SocketException>()
                                               .OrInner<SocketException>()
                                               .WaitAndRetryAsync(3, x => TimeSpan.FromMilliseconds(x * 333))
                );
    }

    private static void SetDefaultHeaders(this HttpRequestHeaders headers)
    {
        headers.CacheControl = new() { NoCache = true };
        headers.UserAgent.Add(new("PulseGuard", "1.0"));
    }
}
