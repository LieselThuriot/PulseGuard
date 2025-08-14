using PulseGuard.Entities;
using PulseGuard.Models;
using System.Net.Mime;
using System.Text;

namespace PulseGuard.Agents;

public abstract class AgentCheck(HttpClient client, PulseAgentConfiguration options)
{
    private readonly HttpClient _client = client;
    public PulseAgentConfiguration Options { get; } = options;

    public abstract Task<PulseAgentReport> CheckAsync(CancellationToken token);

    protected Task<HttpResponseMessage> Post(string body, CancellationToken token)
    {
        HttpRequestMessage request = new(HttpMethod.Post, Options.Location)
        {
            Content = new StringContent(body, Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        return Send(request, token);
    }

    private Task<HttpResponseMessage> Send(HttpRequestMessage request, CancellationToken token)
    {
        foreach ((string name, string value) in Options.GetHeaders())
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }

        return _client.SendAsync(request, token);
    }
}
