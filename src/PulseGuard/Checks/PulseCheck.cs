using PulseGuard.Entities;
using PulseGuard.Models;
using PulseGuard.Services;

namespace PulseGuard.Checks;

public abstract class PulseCheck(HttpClient client, PulseConfiguration options, AuthHeader? authorization)
{
    private readonly HttpClient _client = client;
    private readonly AuthHeader? _authorization = authorization;

    public PulseConfiguration Options { get; } = options;

    public async Task<PulseReport> CheckAsync(CancellationToken token)
    {
        HttpRequestMessage request = new(HttpMethod.Get, Options.Location);

        if (Options.IgnoreSslErrors)
        {
            request.Options.Set(new("IgnoreSslErrors"), true);
        }

        foreach ((string name, string value) in Options.GetHeaders())
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }

        _authorization?.ApplyTo(request);

        HttpResponseMessage response = await _client.SendAsync(request, token);
        return await CreateReport(response, token);
    }

    protected abstract Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token);
}