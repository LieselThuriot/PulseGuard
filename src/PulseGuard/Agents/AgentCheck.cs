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

public abstract class AgentCheck(HttpClient client, IReadOnlyList<PulseAgentConfiguration> options, AuthHeader? authorization) : IAgentCheck
{
    private readonly HttpClient _client = client;
    private readonly AuthHeader? _authorization = authorization;

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

    protected Task<HttpResponseMessage> Send(HttpRequestMessage request, PulseAgentConfiguration options, CancellationToken token)
    {
        foreach ((string name, string value) in options.GetHeaders())
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }

        _authorization?.ApplyTo(request);
        return _client.SendAsync(request, token);
    }

    public double? LargerThanZero(double? value) => value is not null and > 0 ? value : null;
}
