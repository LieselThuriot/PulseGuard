using Microsoft.AspNetCore.Http.Metadata;
using ProtoBuf;
using System.Reflection;

namespace PulseGuard;

/// <summary>
/// An implementation of IResult that serializes an object to protobuf format.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="ProtoResult"/> class.
/// </remarks>
/// <param name="value">The value to serialize as protobuf.</param>
public sealed class ProtoResult(object value, bool immutable) : IResult, IEndpointMetadataProvider, IStatusCodeHttpResult, IContentTypeHttpResult
{
    internal const string ProtoContentType = "application/protobuf";
    private const int StatusCodeValue = 200;

    private readonly object _value = value;
    private readonly bool _immutable = immutable;

    public int? StatusCode => StatusCodeValue;

    public string? ContentType => ProtoContentType;

    public static void PopulateMetadata(MethodInfo method, EndpointBuilder builder)
    {
        ProducesResponseTypeMetadata metadata = new(StatusCodeValue, typeof(byte[]), [ProtoContentType]);
        builder.Metadata.Add(metadata);
    }

    public Task ExecuteAsync(HttpContext httpContext)
    {
        httpContext.Response.StatusCode = StatusCodeValue;
        httpContext.Response.ContentType = ProtoContentType;

        if (_immutable)
        {
            // cache until the end of the day, since these results are immutable and we want to avoid unnecessary deserialization on the client side
            DateTimeOffset utcNow = DateTimeOffset.UtcNow;
            string maxAge = ((int)(utcNow.Date.AddDays(1) - utcNow).TotalSeconds).ToString();
            httpContext.Response.Headers.CacheControl = $"public, max-age={maxAge}, immutable";
        }

        Serializer.Serialize(httpContext.Response.BodyWriter, _value);
        return Task.CompletedTask;
    }
}