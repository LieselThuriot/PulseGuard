using Azure;
using Azure.Data.Tables;
using PulseGuard.Agents;
using PulseGuard.Checks;
using PulseGuard.Entities;
using PulseGuard.Infrastructure;
using PulseGuard.Models;
using PulseGuard.Models.Admin;
using PulseGuard.Services;
using System.Security.Claims;
using TableStorage;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class AdminRoutes
{
    private const string UserEndpoint = "api/1.0/user";

    extension(IEndpointRouteBuilder builder)
    {
        public void MapAdministration(bool authorized)
        {
            if (!authorized)
            {
                EmptyUserInfo emptyUserInfoInstance = new();
                builder.MapGet(UserEndpoint, () => emptyUserInfoInstance);
                return;
            }

            builder.MapGet(UserEndpoint, static (ClaimsPrincipal user) => new UserInfo(
                    user.Identity?.Name,
                    user.FindFirstValue("firstname"),
                    user.FindFirstValue("lastname"),
                    user.Identities.SelectMany(i => i.FindAll(i.RoleClaimType)).Select(r => r.Value)
            ));

            var appGroup = builder.MapGroup("api/1.0/admin").RequireAuthorization(AuthSetup.AdministratorPolicy);

            var configurations = appGroup.MapGroup("configurations").WithTags("Admin", "Overview");
            configurations.CreateOverviewMappings();
            configurations.MapGroup("pulse").WithTags("Admin", "PulseConfigurations").CreateNormalMappings();
            configurations.MapGroup("agent").WithTags("Admin", "AgentConfigurations").CreateAgentMappings();

            appGroup.MapGroup("webhooks").WithTags("Admin", "Webhooks").CreateWebhookMappings();
            appGroup.MapGroup("users").WithTags("Admin", "Users").CreateUserMappings();
            appGroup.MapGroup("credentials").WithTags("Admin", "Credentials").CreateCredentialMappings();
        }

        private void CreateCredentialMappings()
        {
            builder.MapGet("ids", static (PulseContext context) => context.Credentials.Select(x => new CredentialOverview(x.PartitionKey.ToCredentialType(), x.RowKey)));

            var creds = builder.MapGroup("").RequireAuthorization(AuthSetup.CredentialsPolicy);

            creds.MapGet("", static async (PulseContext context, CancellationToken token) =>
            {
                var credentials = await context.Credentials.ToListAsync(token);
                var entries = credentials.Select(x => x.SwitchCaseOrDefault<CredentialEntry>(static x => new OAuth2CredentialEntry(x.Id, x.TokenEndpoint, x.ClientId, x.ClientSecret, x.Scopes),
                                                                                             static x => new BasicCredentialEntry(x.Id, x.Username, x.Password),
                                                                                             static x => new ApiKeyCredentialEntry(x.Id, x.Header, x.ApiKey)));
                return Results.Ok(entries);
            });

            creds.MapOAuth2Auth();
            creds.MapBasicAuth();
            creds.MapApiKeyAuth();
        }

        private void MapOAuth2Auth()
        {
            var oauth2 = builder.MapGroup("oauth2");
            oauth2.MapDelete("{id}", static async (string id, PulseContext context, OAuth2CredentialsService service, CancellationToken token) =>
            {
                var credential = await context.Credentials.FindOAuth2CredentialsAsync(id, token);

                if (credential is not null)
                {
                    await context.Credentials.DeleteOAuth2CredentialsAsync(id, token);
                    service.Purge(credential);
                }

                return Results.NoContent();
            });

            oauth2.MapPost("{id}", static async (string id, OAuth2CredentialRequest request, PulseContext context, CancellationToken token) =>
            {
                OAuth2Credentials credentials = new()
                {
                    Id = id,
                    TokenEndpoint = request.TokenEndpoint,
                    ClientId = request.ClientId,
                    ClientSecret = request.ClientSecret,
                    Scopes = request.Scopes
                };

                await context.Credentials.AddEntityAsync(credentials, token);
                return Results.NoContent();
            });

            oauth2.MapPut("{id}", static async (string id, OAuth2CredentialRequest request, PulseContext context, OAuth2CredentialsService service, CancellationToken token) =>
            {
                var existing = await context.Credentials.FindOAuth2CredentialsAsync(id, token);

                OAuth2Credentials credentials = new()
                {
                    Id = id,
                    TokenEndpoint = request.TokenEndpoint,
                    ClientId = request.ClientId,
                    ClientSecret = request.ClientSecret,
                    Scopes = request.Scopes
                };

                await context.Credentials.UpdateEntityAsync(credentials, token);

                if (existing is not null)
                {
                    service.Purge(existing);
                }

                return Results.NoContent();
            });
        }

        private void MapBasicAuth()
        {
            var basic = builder.MapGroup("basic");
            basic.MapDelete("{id}", static async (string id, PulseContext context, CancellationToken token) =>
            {
                await context.Credentials.DeleteBasicCredentialsAsync(id, token);
                return Results.NoContent();
            });

            basic.MapPost("{id}", static async (string id, BasicCredentialRequest request, PulseContext context, CancellationToken token) =>
            {
                BasicCredentials credentials = new()
                {
                    Id = id,
                    Username = request.Username,
                    Password = request.Password
                };

                await context.Credentials.AddEntityAsync(credentials, token);
                return Results.NoContent();
            });

            basic.MapPut("{id}", static async (string id, BasicCredentialRequest request, PulseContext context, CancellationToken token) =>
            {
                BasicCredentials credentials = new()
                {
                    Id = id,
                    Username = request.Username,
                    Password = request.Password
                };

                await context.Credentials.UpdateEntityAsync(credentials, token);
                return Results.NoContent();
            });
        }

        private void MapApiKeyAuth()
        {
            var apikey = builder.MapGroup("apikey");
            apikey.MapDelete("{id}", static async (string id, PulseContext context, CancellationToken token) =>
            {
                await context.Credentials.DeleteApiKeyCredentialsAsync(id, token);
                return Results.NoContent();
            });

            apikey.MapPost("{id}", static async (string id, ApiKeyCredentialRequest request, PulseContext context, CancellationToken token) =>
            {
                ApiKeyCredentials credentials = new()
                {
                    Id = id,
                    Header = request.Header,
                    ApiKey = request.ApiKey
                };

                await context.Credentials.AddEntityAsync(credentials, token);
                return Results.NoContent();
            });

            apikey.MapPut("{id}", static async (string id, ApiKeyCredentialRequest request, PulseContext context, CancellationToken token) =>
            {
                ApiKeyCredentials credentials = new()
                {
                    Id = id,
                    Header = request.Header,
                    ApiKey = request.ApiKey
                };

                await context.Credentials.UpdateEntityAsync(credentials, token);
                return Results.NoContent();
            });
        }

        private void CreateUserMappings()
        {
            builder.MapGet("", static (PulseContext context) => context.Settings.WhereUser().Select(x => new UserEntry(x)));

            builder.MapGet("{id}", static async (string id, PulseContext context, CancellationToken token) =>
            {
                User? user = await context.Settings.FindUserAsync(id, token);

                if (user is null)
                {
                    return Results.NotFound();
                }

                UserEntry result = new(user);
                return Results.Ok(result);
            });

            builder.MapDelete("{id}", static async (string id, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                User? user = await context.Settings.FindUserAsync(id, token);

                if (user is null)
                {
                    return Results.NotFound();
                }

                await context.Settings.DeleteEntityAsync(user, token);
                logger.DeletedUser(id);

                return Results.NoContent();
            });

            builder.MapPut("{id}", static async (string id, UserCreateOrUpdateRequest request, PulseContext context, ILogger<Program> logger, ClaimsPrincipal currentUser, CancellationToken token) =>
            {
                if (request.Roles is not null)
                {
                    IEnumerable<string> myRoles = currentUser.Identities.SelectMany(i => i.FindAll(i.RoleClaimType)).Select(r => r.Value);
                    if (request.Roles.Except(myRoles).Any())
                    {
                        return Results.BadRequest("You're only allowed to give roles you have yourself.");
                    }
                }

                User? user = await context.Settings.FindUserAsync(id, token);

                if (user is null)
                {
                    return Results.NotFound();
                }

                user.Roles = request.GetRoles();
                user.Nickname = request.Nickname;

                try
                {
                    await context.Settings.UpdateEntityAsync(user, user.ETag, TableUpdateMode.Replace, token);
                    logger.UpdatedUser(user.UserId);
                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    logger.ErrorUpdatingUser(ex, user.UserId);
                    return Results.Conflict();
                }
            });

            builder.MapPut("{id}/name", static async (string id, RenameUserRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                User? user = await context.Settings.FindUserAsync(id, token);

                if (user is null)
                {
                    return Results.NotFound();
                }

                user.Nickname = request.Name;

                try
                {
                    await context.Settings.UpdateEntityAsync(user, user.ETag, TableUpdateMode.Replace, token);
                    logger.RenamedUser(id);

                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    logger.ErrorRenamingUser(ex, id);
                    return Results.Conflict();
                }
            });

            builder.MapPost("{id}", static async (string id, UserCreateOrUpdateRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                User user = new()
                {
                    UserId = id,
                    Nickname = request.Nickname,
                    Roles = request.GetRoles()
                };

                try
                {
                    await context.Settings.AddEntityAsync(user, token);
                    logger.CreatedUser(user.UserId);

                    return Results.Created();
                }
                catch (Exception ex)
                {
                    logger.ErrorCreatingUser(ex, user.UserId);
                    return Results.Conflict();
                }
            });
        }

        private void CreateOverviewMappings()
        {
            builder.MapGet("", static async (PulseContext context, CancellationToken token) =>
            {
                var identifiers = await context.Settings.WhereUniqueIdentifier()
                                               .SelectFields(x => new { x.Id, x.Group, x.Name })
                                               .ToDictionaryAsync(x => x.Id, x => (x.Group, x.Name), cancellationToken: token);

                PulseEntry? Create(string id, PulseEntryType type, string subType, bool enabled)
                {
                    if (!identifiers.TryGetValue(id, out var info))
                    {
                        return null;
                    }

                    return new PulseEntry(id, type, subType, info.Group, info.Name, enabled);
                }

                var configurations = context.Configurations
                                            .SelectFields(x => new { x.Sqid, x.Type, x.Enabled })
                                            .Select(x => Create(x.Sqid, PulseEntryType.Normal, x.Type.Stringify(), x.Enabled));

                var agentConfigurations = context.AgentConfigurations
                                                 .SelectFields(x => new { x.Sqid, x.Type, x.Enabled })
                                                 .Select(x => Create(x.Sqid, PulseEntryType.Agent, x.Type, x.Enabled));

                return await configurations.Concat(agentConfigurations)
                                           .Where(x => x is not null)
                                           .ToListAsync(token);
            });

            builder.MapPut("{id}/name", static async (string id, PulseUpdateRequest entry, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                if (entry is { Group: not null, Name: not null })
                {
                    await context.Settings.UpdateAsync(() => new UniqueIdentifier()
                    {
                        Id = id,
                        Group = entry.Group,
                        Name = entry.Name
                    },
                    token);

                    logger.UpdatedPulseEntry(id, entry.Group, entry.Name);
                    return Results.NoContent();
                }

                return Results.BadRequest();
            });
        }

        private void CreateWebhookMappings()
        {
            builder.MapGet("", static (PulseContext context) => context.Webhooks.Select(x => new WebhookEntry(x.Id, x.Type, x.Group, x.Name, x.Location, x.Enabled, null)));

            builder.MapGet("{id}", static async (string id, PulseContext context, CancellationToken token) =>
            {
                var webhook = await context.Webhooks.Where(x => x.Id == id).FirstOrDefaultAsync(token);

                if (webhook is null)
                {
                    return Results.NotFound();
                }

                var credential = webhook.GetCredential();
                CredentialOverview? credentialOverview;
                if (credential.HasValue)
                {
                    var (credType, credId) = credential.GetValueOrDefault();
                    credentialOverview = new(credType, credId);
                }
                else
                {
                    credentialOverview = null;
                }

                WebhookEntry entry = new(webhook.Id, webhook.Type, webhook.Group, webhook.Name, webhook.Location, webhook.Enabled, credentialOverview);

                return Results.Ok(entry);
            });

            builder.MapDelete("{id}", static async (string id, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                var webhook = await context.Webhooks.Where(x => x.Id == id).FirstOrDefaultAsync(token);

                if (webhook is null)
                {
                    return Results.NotFound();
                }

                await context.Webhooks.DeleteEntityAsync(webhook, token);
                logger.DeletedWebhookEntry(id);

                return Results.NoContent();
            });

            builder.MapPut("{id}", static async (string id, WebhookUpdateRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                var webhook = await context.Webhooks.Where(x => x.Id == id).FirstOrDefaultAsync(token);

                if (webhook is null)
                {
                    return Results.NotFound();
                }

                webhook.Type = request.Type;
                webhook.Group = request.Group;
                webhook.Name = request.Name;
                webhook.Location = request.Location;
                webhook.Enabled = request.Enabled;
                webhook.SetCredential(request.Credential?.Type, request.Credential?.Id);

                try
                {
                    await context.Webhooks.UpdateEntityAsync(webhook, webhook.ETag, TableUpdateMode.Replace, token);
                    logger.UpdatedWebhookEntry(id);

                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    logger.ErrorUpdatingWebhookEntry(ex, id);
                    return Results.Conflict();
                }
            });

            builder.MapPut("{id}/{enabled}", static async (string id, bool enabled, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                var webhook = await context.Webhooks.Where(x => x.Id == id).FirstOrDefaultAsync(token);

                if (webhook is null)
                {
                    return Results.NotFound();
                }

                webhook.Enabled = enabled;

                try
                {
                    await context.Webhooks.UpdateEntityAsync(webhook, webhook.ETag, TableUpdateMode.Replace, token);
                    logger.UpdatedWebhookEntry(id);

                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    logger.ErrorUpdatingWebhookEntry(ex, id);
                    return Results.Conflict();
                }
            });

            builder.MapPost("", static async (WebhookCreationRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                Webhook webhook = new()
                {
                    Id = Guid.CreateVersion7().ToString("N"),
                    Secret = request.Secret,
                    Type = request.Type,
                    Group = request.Group,
                    Name = request.Name,
                    Location = request.Location,
                    Enabled = request.Enabled
                };

                webhook.SetCredential(request.Credential?.Type, request.Credential?.Id);

                try
                {
                    await context.Webhooks.AddEntityAsync(webhook, token);
                    logger.CreatedWebhookEntry(webhook.Id);

                    return Results.Created();
                }
                catch (Exception ex)
                {
                    logger.ErrorCreatingWebhookEntry(ex);
                    return Results.Conflict();
                }
            });
        }

        private void CreateAgentMappings()
        {
            builder.MapGet("{id}/{type}", static async (string id, string type, PulseContext context, CancellationToken token) =>
            {
                var configuration = await context.AgentConfigurations.Where(x => x.Sqid == id && x.Type == type).FirstOrDefaultAsync(token);

                if (configuration is null)
                {
                    return Results.NotFound();
                }

                var credential = configuration.GetCredential();
                CredentialOverview? credentialOverview;
                if (credential.HasValue)
                {
                    var (credType, credId) = credential.GetValueOrDefault();
                    credentialOverview = new(credType, credId);
                }
                else
                {
                    credentialOverview = null;
                }

                return Results.Ok(new PulseAgentCreationRequest()
                {
                    Location = configuration.Location,
                    ApplicationName = configuration.ApplicationName,
                    SubscriptionId = configuration.SubscriptionId,
                    BuildDefinitionId = configuration.BuildDefinitionId,
                    StageName = configuration.StageName,
                    Enabled = configuration.Enabled,
                    Headers = configuration.GetHeaders().ToDictionary(x => x.name, x => x.values),
                    Credential = credentialOverview
                });
            });

            builder.MapPut("{id}/{type}/{enabled}", static async (string id, string type, bool enabled, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                var config = await context.AgentConfigurations.FindAsync(id, type, token);
                if (config is null)
                {
                    return Results.NotFound();
                }

                config.Enabled = enabled;

                try
                {
                    await context.AgentConfigurations.UpdateEntityAsync(config, token);

                    logger.UpdatedAgentConfigurationEnabled(id, type, enabled);
                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    logger.ErrorUpdatingAgentConfigurationEnabled(ex, id, type, enabled);
                    return Results.Conflict();
                }
            });

            builder.MapPost("{id}/{type}", static async (string id, string type, PulseAgentCreationRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                if (request.IsInvalid(type, out string? validation))
                {
                    return Results.BadRequest(validation);
                }

                PulseAgentConfiguration config = new()
                {
                    Sqid = id,
                    Type = type,
                    Location = request.Location,
                    ApplicationName = request.ApplicationName,
                    SubscriptionId = request.SubscriptionId,
                    BuildDefinitionId = request.BuildDefinitionId,
                    StageName = request.StageName,
                    Enabled = request.Enabled,
                    Headers = PulseAgentConfiguration.CreateHeaders(request.Headers)
                };

                config.SetCredential(request.Credential?.Type, request.Credential?.Id);

                try
                {
                    await context.AgentConfigurations.AddEntityAsync(config, token);

                    logger.CreatedAgentConfiguration(id, type);
                    return Results.Created();
                }
                catch (Exception ex)
                {
                    logger.ErrorCreatingAgentConfiguration(ex, id, type);
                    return Results.Conflict();
                }
            });

            builder.MapPut("{id}/{type}", static async (string id, string type, PulseAgentCreationRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                if (request.IsInvalid(type, out string? validation))
                {
                    return Results.BadRequest(validation);
                }

                PulseAgentConfiguration config = new()
                {
                    Sqid = id,
                    Type = type,
                    Location = request.Location,
                    ApplicationName = request.ApplicationName,
                    SubscriptionId = request.SubscriptionId,
                    BuildDefinitionId = request.BuildDefinitionId,
                    StageName = request.StageName,
                    Enabled = request.Enabled,
                    Headers = PulseAgentConfiguration.CreateHeaders(request.Headers)
                };

                config.SetCredential(request.Credential?.Type, request.Credential?.Id);

                try
                {
                    await context.AgentConfigurations.UpdateEntityAsync(config, ETag.All, TableUpdateMode.Replace, token);

                    logger.UpdatedAgentConfiguration(id, type);
                    return Results.Created();
                }
                catch (Exception ex)
                {
                    logger.ErrorUpdatingAgentConfiguration(ex, id, type);
                    return Results.Conflict();
                }
            });

            builder.MapDelete("{id}/{type}", static async (string id, string type, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                var configuration = await context.AgentConfigurations.FindAsync(id, type, token);

                if (configuration is null)
                {
                    return Results.NotFound();
                }

                await context.AgentConfigurations.DeleteEntityAsync(configuration, token);

                logger.DeletedAgentConfiguration(id, type);
                return Results.NoContent();
            });
        }

        private void CreateNormalMappings()
        {
            builder.MapGet("{id}", static async (string id, PulseContext context, CancellationToken token) =>
            {
                var configuration = await context.Configurations.Where(x => x.Sqid == id).FirstOrDefaultAsync(token);

                if (configuration is null)
                {
                    return Results.NotFound();
                }

                var credential = configuration.GetCredential();
                CredentialOverview? credentialOverview;
                if (credential.HasValue)
                {
                    var (credType, credId) = credential.GetValueOrDefault();
                    credentialOverview = new(credType, credId);
                }
                else
                {
                    credentialOverview = null;
                }

                return Results.Ok(new PulseCreationRequest()
                {
                    Group = configuration.Group,
                    Name = configuration.Name,
                    Type = configuration.Type,
                    Location = configuration.Location,
                    Timeout = configuration.Timeout,
                    DegrationTimeout = configuration.DegrationTimeout,
                    Enabled = configuration.Enabled,
                    IgnoreSslErrors = configuration.IgnoreSslErrors,
                    ComparisonValue = configuration.ComparisonValue,
                    Headers = configuration.GetHeaders().ToDictionary(x => x.name, x => x.values),
                    Credential = credentialOverview
                });
            });

            builder.MapPost("", static async (PulseCreationRequest request, PulseStore store, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                if (request.Type is PulseCheckType.Json or PulseCheckType.Contains && string.IsNullOrWhiteSpace(request.ComparisonValue))
                {
                    return Results.BadRequest($"ComparisonValue is required for {request.Type} type.");
                }

                if (request.DegrationTimeout >= request.Timeout)
                {
                    return Results.BadRequest("DegrationTimeout must be less than Timeout.");
                }

                string sqid = await store.GenerateSqid(request.Group, request.Name, token);
                PulseConfiguration config = new()
                {
                    Group = request.Group,
                    Name = request.Name,
                    Sqid = sqid,
                    Type = request.Type,
                    Location = request.Location,
                    Timeout = request.Timeout,
                    DegrationTimeout = request.DegrationTimeout,
                    Enabled = request.Enabled,
                    IgnoreSslErrors = request.IgnoreSslErrors,
                    ComparisonValue = request.ComparisonValue,
                    Headers = PulseConfiguration.CreateHeaders(request.Headers)
                };

                config.SetCredential(request.Credential?.Type, request.Credential?.Id);

                try
                {
                    await context.Configurations.AddEntityAsync(config, token);

                    logger.CreatedNormalConfiguration(sqid, request.Type.ToString());
                    return Results.Created();
                }
                catch (Exception ex)
                {
                    logger.ErrorCreatingNormalConfiguration(ex);
                    return Results.Conflict();
                }
            });

            builder.MapPut("{id}", static async (string id, PulseCreationRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                if (request.Type is PulseCheckType.Json or PulseCheckType.Contains && string.IsNullOrWhiteSpace(request.ComparisonValue))
                {
                    return Results.BadRequest($"ComparisonValue is required for {request.Type} type.");
                }

                PulseConfiguration config = new()
                {
                    Group = request.Group,
                    Name = request.Name,
                    Sqid = id,
                    Type = request.Type,
                    Location = request.Location,
                    Timeout = request.Timeout,
                    DegrationTimeout = request.DegrationTimeout,
                    Enabled = request.Enabled,
                    IgnoreSslErrors = request.IgnoreSslErrors,
                    ComparisonValue = request.ComparisonValue,
                    Headers = PulseConfiguration.CreateHeaders(request.Headers)
                };

                config.SetCredential(request.Credential?.Type, request.Credential?.Id);

                try
                {
                    await context.Configurations.UpdateEntityAsync(config, ETag.All, TableUpdateMode.Replace, token);

                    logger.UpdatedNormalConfiguration(id, request.Type.ToString());
                    return Results.Created();
                }
                catch (Exception ex)
                {
                    logger.ErrorUpdatingNormalConfiguration(ex, id, request.Type.ToString());
                    return Results.Conflict();
                }
            });

            builder.MapPut("{id}/{enabled}", static async (string id, bool enabled, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                var config = await context.Configurations.FirstOrDefaultAsync(x => x.Sqid == id, token);
                if (config is null)
                {
                    return Results.NotFound();
                }

                config.Enabled = enabled;

                try
                {
                    await context.Configurations.UpdateEntityAsync(config, token);

                    logger.UpdatedNormalConfigurationEnabled(id, enabled);
                    return Results.NoContent();
                }
                catch (Exception ex)
                {
                    logger.ErrorUpdatingNormalConfigurationEnabled(ex, id, enabled);
                    return Results.Conflict();
                }
            });

            builder.MapDelete("{id}", static async (string id, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                var configuration = await context.Configurations.Where(x => x.Sqid == id).FirstOrDefaultAsync(token);

                if (configuration is null)
                {
                    return Results.NotFound();
                }

                await context.Configurations.DeleteEntityAsync(configuration, token);

                logger.DeletedNormalConfiguration(id);
                return Results.NoContent();
            });
        }
    }
}