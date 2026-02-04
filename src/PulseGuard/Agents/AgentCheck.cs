using PulseGuard.Entities;
using PulseGuard.Models;
using PulseGuard.Services;
using System.Net.Mime;
using System.Text;

namespace PulseGuard.Agents;

public interface IAgentCheck
{
    public Task<IReadOnlyList<AgentReport>> CheckAsync(CancellationToken token);
}

public abstract class AgentCheck(HttpClient client, IReadOnlyList<PulseAgentConfiguration> options, Services.AuthService authenticationService) : IAgentCheck
{
    private readonly HttpClient _client = client;
    private readonly AuthService _authenticationService = authenticationService;

    public IReadOnlyList<PulseAgentConfiguration> Options { get; } = options;

    public abstract Task<IReadOnlyList<AgentReport>> CheckAsync(CancellationToken token);

    protected Task<HttpResponseMessage> Post(string body, PulseAgentConfiguration options, CancellationToken token)
    {
        HttpRequestMessage request = new(HttpMethod.Post, options.Location)
        {
            Content = new StringContent(body, Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        return Send(request, options, token);
    }

    protected async Task<HttpResponseMessage> Send(HttpRequestMessage request, PulseAgentConfiguration options, CancellationToken token)
    {
        foreach ((string name, string value) in options.GetHeaders())
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }

        //TODO: This shouldn't be counted towards the execution time of the request as it's not fair
        var authorization = await _authenticationService.GetAsync(options, token);
        if (authorization is not null)
        {
            request.Headers.TryAddWithoutValidation(authorization.Header, authorization.Value);
        }

        return await _client.SendAsync(request, token);
    }

    public double? LargerThanZero(double? value) => value is not null and > 0 ? value : null;
}
