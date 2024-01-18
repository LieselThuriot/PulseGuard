using Microsoft.AspNetCore.Http.Features;

namespace PulseGuard;

public sealed class HttpResponseMessageResult(Task<HttpResponseMessage> asyncResponseMessage) : IResult
{
    private readonly Task<HttpResponseMessage> _asyncResponseMessage = asyncResponseMessage;

    public async Task ExecuteAsync(HttpContext httpContext)
    {
        var response = httpContext.Response;

        using var responseMessage = await _asyncResponseMessage;

        response.StatusCode = (int)responseMessage.StatusCode;

        var responseFeature = httpContext.Features.Get<IHttpResponseFeature>();
        if (responseFeature != null)
        {
            responseFeature.ReasonPhrase = responseMessage.ReasonPhrase;
        }

        var responseHeaders = responseMessage.Headers;

        // Ignore the Transfer-Encoding header if it is just "chunked".
        // We let the host decide about whether the response should be chunked or not.
        if (responseHeaders.TransferEncodingChunked == true &&
            responseHeaders.TransferEncoding.Count == 1)
        {
            responseHeaders.TransferEncoding.Clear();
        }

        foreach (var header in responseHeaders)
        {
            response.Headers.Append(header.Key, header.Value.ToArray());
        }

        if (responseMessage.Content != null)
        {
            var contentHeaders = responseMessage.Content.Headers;

            // Copy the response content headers only after ensuring they are complete.
            // We ask for Content-Length first because HttpContent lazily computes this
            // and only afterwards writes the value into the content headers.
            _ = contentHeaders.ContentLength;

            foreach (var header in contentHeaders)
            {
                response.Headers.Append(header.Key, header.Value.ToArray());
            }

            await responseMessage.Content.CopyToAsync(response.Body);
        }
    }
}