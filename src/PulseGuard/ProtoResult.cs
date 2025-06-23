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
public sealed class ProtoResult(object value) : IResult, IEndpointMetadataProvider, IStatusCodeHttpResult, IContentTypeHttpResult
{
    private const string ProtoContentType = "application/protobuf";
    private const int StatusCodeValue = 200;

    private readonly object _value = value;

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
        Serializer.Serialize(httpContext.Response.BodyWriter, _value);
        return Task.CompletedTask;
    }
}