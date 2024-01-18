using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Checks;

public abstract class PulseCheck(HttpClient client, PulseConfiguration options)
{
    private readonly HttpClient _client = client;
    public PulseConfiguration Options { get; } = options;

    public async Task<PulseReport> CheckAsync(CancellationToken token)
    {
        HttpRequestMessage request = new(HttpMethod.Get, Options.Location);

        if (Options.IgnoreSslErrors)
        {
            request.Options.Set(new("IgnoreSslErrors"), true);
        }

        HttpResponseMessage response = await _client.SendAsync(request, token);
        return await CreateReport(response, token);
    }

    protected abstract Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token);
}