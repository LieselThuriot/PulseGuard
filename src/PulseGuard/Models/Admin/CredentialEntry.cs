using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PulseGuard.Models.Admin;

public sealed record CredentialOverview(string Type, string Id);

[JsonPolymorphic]
[JsonDerivedType(typeof(ApiKeyCredentialEntry), "ApiKey")]
[JsonDerivedType(typeof(BasicCredentialEntry), "Basic")]
[JsonDerivedType(typeof(OAuth2CredentialEntry), "OAuth2")]
public abstract record CredentialEntry(string Id);

public sealed record ApiKeyCredentialEntry(string Id, string Header, string ApiKey) : CredentialEntry(Id);
public sealed record BasicCredentialEntry(string Id, string? Username, string Password) : CredentialEntry(Id);
public sealed record OAuth2CredentialEntry(string Id, string TokenEndpoint, string ClientId, string ClientSecret, string? Scopes) : CredentialEntry(Id);

public sealed record ApiKeyCredentialRequest([Required] string Header, [Required] string ApiKey);
public sealed record BasicCredentialRequest(string? Username, [Required] string Password);
public sealed record OAuth2CredentialRequest([Required] string TokenEndpoint, [Required] string ClientId, [Required] string ClientSecret, string? Scopes);