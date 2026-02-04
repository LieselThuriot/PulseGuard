using PulseGuard.Entities;
using PulseGuard.Models;
using PulseGuard.Services;

namespace PulseGuard.Checks;

public abstract class PulseCheck(HttpClient client, PulseConfiguration options, AuthService authenticationService)
{
    private readonly HttpClient _client = client;
    private readonly AuthService _authenticationService = authenticationService;

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

        //TODO: This shouldn't be counted towards the execution time of the request as it's not fair
        var authorization = await _authenticationService.GetAsync(Options, token);
        if (authorization is not null)
        {
            request.Headers.TryAddWithoutValidation(authorization.Header, authorization.Value);
        }

        HttpResponseMessage response = await _client.SendAsync(request, token);
        return await CreateReport(response, token);
    }

    protected abstract Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token);
}