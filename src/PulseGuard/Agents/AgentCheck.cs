using PulseGuard.Entities;
using PulseGuard.Models;
using System.Net.Mime;
using System.Text;

namespace PulseGuard.Agents;

public abstract class AgentCheck(HttpClient client, IReadOnlyList<PulseAgentConfiguration> options)
{
    private readonly HttpClient _client = client;
    public IReadOnlyList<PulseAgentConfiguration> Options { get; } = options;

    public abstract Task<IReadOnlyList<PulseAgentReport>> CheckAsync(CancellationToken token);

    protected Task<HttpResponseMessage> Post(string body, PulseAgentConfiguration options, CancellationToken token)
    {
        HttpRequestMessage request = new(HttpMethod.Post, options.Location)
        {
            Content = new StringContent(body, Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        return Send(request, options, token);
    }

    private Task<HttpResponseMessage> Send(HttpRequestMessage request, PulseAgentConfiguration options, CancellationToken token)
    {
        foreach ((string name, string value) in options.GetHeaders())
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }

        return _client.SendAsync(request, token);
    }

    public double? LargerThanZero(double? value) => value is not null and > 0 ? value : null;
}
