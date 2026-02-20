using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CredentialType = PulseGuard.Entities.CredentialType;

namespace PulseGuard.Models.Admin;

public sealed record CredentialOverview(CredentialType Type, string Id);

[JsonPolymorphic]
[JsonDerivedType(typeof(ApiKeyCredentialEntry), nameof(CredentialType.ApiKey))]
[JsonDerivedType(typeof(BasicCredentialEntry), nameof(CredentialType.Basic))]
[JsonDerivedType(typeof(OAuth2CredentialEntry), nameof(CredentialType.OAuth2))]
public abstract record CredentialEntry(string Id);

public sealed record ApiKeyCredentialEntry(string Id, string Header) : CredentialEntry(Id);
public sealed record BasicCredentialEntry(string Id, string? Username) : CredentialEntry(Id);
public sealed record OAuth2CredentialEntry(string Id, string TokenEndpoint, string ClientId, string? Scopes) : CredentialEntry(Id);

public sealed record ApiKeyCredentialRequest([Required] string Header, [Required] string ApiKey);
public sealed record BasicCredentialRequest(string? Username, [Required] string Password);
public sealed record OAuth2CredentialRequest([Required] string TokenEndpoint, [Required] string ClientId, [Required] string ClientSecret, string? Scopes);