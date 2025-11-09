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

    public static void MapAdministration(this IEndpointRouteBuilder app, bool authorized)
    {
        if (!authorized)
        {
            EmptyUserInfo emptyUserInfoInstance = new();
            app.MapGet(UserEndpoint, () => emptyUserInfoInstance);
            return;
        }

        app.MapGet(UserEndpoint, static (ClaimsPrincipal user) => new UserInfo(
                user.Identity?.Name,
                user.FindFirstValue("firstname"),
                user.FindFirstValue("lastname"),
                user.Identities.SelectMany(i => i.FindAll(i.RoleClaimType)).Select(r => r.Value)
        ));

        var group = app.MapGroup("api/1.0/admin").RequireAuthorization(AuthSetup.AdministratorPolicy);
        var configurations = group.MapGroup("configurations").WithTags("Admin", "Overview");

        CreateOverviewMappings(configurations);
        CreateNormalMappings(configurations.MapGroup("pulse").WithTags("Admin", "PulseConfigurations"));
        CreateAgentMappings(configurations.MapGroup("agent").WithTags("Admin", "AgentConfigurations"));
        CreateWebhookMappings(group.MapGroup("webhooks").WithTags("Admin", "Webhooks"));
        CreateUserMappings(group.MapGroup("users").WithTags("Admin", "Users"));
    }

    private static void CreateUserMappings(RouteGroupBuilder group)
    {
        group.MapGet("", static (PulseContext context) => context.Users.Select(x => new UserEntry(x)));

        group.MapGet("{id}", static async (string id, PulseContext context, CancellationToken token) =>
        {
            var user = await context.Users.FindAsync(id, User.UserInfoRowType, token);

            if (user is null)
            {
                return Results.NotFound();
            }

            UserEntry result = new(user);
            return Results.Ok(result);
        });

        group.MapDelete("{id}", static async (string id, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            var user = await context.Users.FindAsync(id, User.UserInfoRowType, token);

            if (user is null)
            {
                return Results.NotFound();
            }

            await context.Users.DeleteEntityAsync(user, token);
            logger.LogInformation(PulseEventIds.Admin, "Deleted User {id} with type {type}", user.UserId, user.RowType);

            return Results.NoContent();
        });

        group.MapPut("{id}", static async (string id, UserCreateOrUpdateRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            var user = await context.Users.FindAsync(id, User.UserInfoRowType, token);

            if (user is null)
            {
                return Results.NotFound();
            }

            user.Roles = request.GetRoles();
            user.Nickname = request.Nickname;

            try
            {
                await context.Users.UpdateEntityAsync(user, user.ETag, TableUpdateMode.Replace, token);
                logger.LogInformation(PulseEventIds.Admin, "Updated User {id} {rowtype}", user.UserId, user.RowType);
                return Results.NoContent();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error updating User {id} {rowtype}", user.UserId, user.RowType);
                return Results.Conflict();
            }
        });

        group.MapPut("{id}/name", static async (string id, RenameUserRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            var user = await context.Users.FindAsync(id, User.UserInfoRowType, token);

            if (user is null)
            {
                return Results.NotFound();
            }

            user.Nickname = request.Name;

            try
            {
                await context.Users.UpdateEntityAsync(user, user.ETag, TableUpdateMode.Replace, token);
                logger.LogInformation(PulseEventIds.Admin, "Renamed User {id}", id);

                return Results.NoContent();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error renaming User {id}", id);
                return Results.Conflict();
            }
        });

        group.MapPost("{id}", static async (string id, UserCreateOrUpdateRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            User user = new()
            {
                UserId = id,
                RowType = User.UserInfoRowType,
                Nickname = request.Nickname,
                Roles = request.GetRoles()
            };

            try
            {
                await context.Users.AddEntityAsync(user, token);
                logger.LogInformation(PulseEventIds.Admin, "Created User {id} {type}", user.UserId, user.RowType);

                return Results.Created();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error creating User {id} {type}", user.UserId, user.RowType);
                return Results.Conflict();
            }
        });
    }

    private static void CreateOverviewMappings(RouteGroupBuilder group)
    {
        group.MapGet("", static async (PulseContext context, CancellationToken token) =>
        {
            var identifiers = await context.UniqueIdentifiers.Where(x => x.IdentifierType == UniqueIdentifier.PartitionPulseConfiguration)
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

        group.MapPut("{id}/name", static async (string id, PulseUpdateRequest entry, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            if (entry is { Group: not null, Name: not null })
            {
                await context.UniqueIdentifiers.UpdateAsync(() => new()
                {
                    IdentifierType = UniqueIdentifier.PartitionPulseConfiguration,
                    Id = id,

                    Group = entry.Group,
                    Name = entry.Name
                },
                token);

                logger.LogInformation(PulseEventIds.Admin, "Updated Pulse Entry {Id} to Group: {Group}, Name: {Name}", id, entry.Group, entry.Name);
                return Results.NoContent();
            }

            return Results.BadRequest();
        });
    }

    private static void CreateWebhookMappings(RouteGroupBuilder group)
    {
        group.MapGet("", static async (PulseContext context, CancellationToken token) =>
        {
            var webhooks = await context.Webhooks.ToListAsync(token);
            var entries = webhooks.Select(x => new WebhookEntry(x.Id, x.Group, x.Name, x.Location, x.Enabled));

            return Results.Ok(entries);
        });

        group.MapGet("{id}", static async (string id, PulseContext context, CancellationToken token) =>
        {
            var webhook = await context.Webhooks.Where(x => x.Id == id).FirstOrDefaultAsync(token);

            if (webhook is null)
            {
                return Results.NotFound();
            }

            WebhookEntry entry = new(webhook.Id, webhook.Group, webhook.Name, webhook.Location, webhook.Enabled);

            return Results.Ok(entry);
        });

        group.MapDelete("{id}", static async (string id, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            var webhook = await context.Webhooks.Where(x => x.Id == id).FirstOrDefaultAsync(token);

            if (webhook is null)
            {
                return Results.NotFound();
            }

            await context.Webhooks.DeleteEntityAsync(webhook, token);
            logger.LogInformation(PulseEventIds.Admin, "Deleted Webhook Entry {Id}", id);

            return Results.NoContent();
        });

        group.MapPut("{id}", static async (string id, WebhookUpdateRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            var webhook = await context.Webhooks.Where(x => x.Id == id).FirstOrDefaultAsync(token);

            if (webhook is null)
            {
                return Results.NotFound();
            }

            webhook.Group = request.Group;
            webhook.Name = request.Name;
            webhook.Location = request.Location;
            webhook.Enabled = request.Enabled;

            try
            {
                await context.Webhooks.UpdateEntityAsync(webhook, webhook.ETag, TableUpdateMode.Replace, token);
                logger.LogInformation(PulseEventIds.Admin, "Updated Webhook Entry {Id}", id);

                return Results.NoContent();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error updating Webhook Entry {Id}", id);
                return Results.Conflict();
            }
        });

        group.MapPut("{id}/{enabled}", static async (string id, bool enabled, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
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
                logger.LogInformation(PulseEventIds.Admin, "Updated Webhook Entry {Id}", id);

                return Results.NoContent();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error updating Webhook Entry {Id}", id);
                return Results.Conflict();
            }
        });

        group.MapPost("", static async (WebhookCreationRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            Webhook webhook = new()
            {
                Id = Guid.CreateVersion7().ToString("N"),
                Secret = request.Secret,
                Group = request.Group,
                Name = request.Name,
                Location = request.Location,
                Enabled = request.Enabled
            };

            try
            {
                await context.Webhooks.AddEntityAsync(webhook, token);
                logger.LogInformation(PulseEventIds.Admin, "Created Webhook Entry {Id}", webhook.Id);

                return Results.Created();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error creating Webhook Entry");
                return Results.Conflict();
            }
        });
    }

    private static void CreateAgentMappings(RouteGroupBuilder agentGroup)
    {
        agentGroup.MapGet("{id}/{type}", static async (string id, string type, PulseContext context, CancellationToken token) =>
        {
            var configuration = await context.AgentConfigurations.Where(x => x.Sqid == id && x.Type == type).FirstOrDefaultAsync(token);

            if (configuration is null)
            {
                return Results.NotFound();
            }

            return Results.Ok(new PulseAgentCreationRequest()
            {
                Location = configuration.Location,
                ApplicationName = configuration.ApplicationName,
                SubscriptionId = configuration.SubscriptionId,
                BuildDefinitionId = configuration.BuildDefinitionId,
                Enabled = configuration.Enabled,
                Headers = configuration.GetHeaders().ToDictionary(x => x.name, x => x.values)
            });
        });

        agentGroup.MapPut("{id}/{type}/{enabled}", static async (string id, string type, bool enabled, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
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

                logger.LogInformation(PulseEventIds.Admin, "Updated Agent Configuration {Id} of type {Type} to Enabled: {Enabled}", id, type, enabled);
                return Results.NoContent();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error updating Agent Configuration {Id} of type {Type} to Enabled: {Enabled}", id, type, enabled);
                return Results.Conflict();
            }
        });

        //TODO: Clean up validations 

        agentGroup.MapPost("{id}/{type}", static async (string id, string type, PulseAgentCreationRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            AgentCheckType agentType = AgentCheckTypeFastString.FromString(type);
            
            if (agentType is AgentCheckType.LogAnalyticsWorkspace or AgentCheckType.WebAppDeployment or AgentCheckType.DevOpsDeployment && string.IsNullOrWhiteSpace(request.ApplicationName))
            {
                return Results.BadRequest("ApplicationName is required for this type of agent.");
            }
            
            if (agentType is AgentCheckType.WebAppDeployment or AgentCheckType.DevOpsDeployment && string.IsNullOrWhiteSpace(request.SubscriptionId))
            {
                return Results.BadRequest("SubscriptionId is required for this type of agent.");
            }

            if (agentType is AgentCheckType.DevOpsDeployment)
            {
                if (!request.BuildDefinitionId.HasValue)
                {
                    return Results.BadRequest("BuildDefinitionId is required for this type of agent.");
                }

                if (request.Headers is null || !request.Headers.TryGetValue("Authorization", out string? authHeader) || string.IsNullOrEmpty(authHeader))
                {
                    return Results.BadRequest("Authorization header is required for this type of agent.");
                }
            }

            PulseAgentConfiguration config = new()
            {
                Sqid = id,
                Type = type,
                Location = request.Location,
                ApplicationName = request.ApplicationName,
                SubscriptionId = request.SubscriptionId,
                BuildDefinitionId = request.BuildDefinitionId,
                Enabled = request.Enabled,
                Headers = PulseAgentConfiguration.CreateHeaders(request.Headers)
            };

            try
            {
                await context.AgentConfigurations.AddEntityAsync(config, token);

                logger.LogInformation(PulseEventIds.Admin, "Created Agent Configuration {Id} of type {Type}", id, type);
                return Results.Created();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error creating Agent Configuration {Id} of type {Type}", id, type);
                return Results.Conflict();
            }
        });

        agentGroup.MapPut("{id}/{type}", static async (string id, string type, PulseAgentCreationRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            AgentCheckType agentType = AgentCheckTypeFastString.FromString(type);

            if (agentType is AgentCheckType.LogAnalyticsWorkspace or AgentCheckType.WebAppDeployment or AgentCheckType.DevOpsDeployment && string.IsNullOrWhiteSpace(request.ApplicationName))
            {
                return Results.BadRequest("ApplicationName is required for this type of agent.");
            }

            if (agentType is AgentCheckType.WebAppDeployment or AgentCheckType.DevOpsDeployment && string.IsNullOrWhiteSpace(request.SubscriptionId))
            {
                return Results.BadRequest("SubscriptionId is required for this type of agent.");
            }

            if (agentType is AgentCheckType.DevOpsDeployment)
            {
                if (!request.BuildDefinitionId.HasValue)
                {
                    return Results.BadRequest("BuildDefinitionId is required for this type of agent.");
                }

                if (request.Headers is null || !request.Headers.TryGetValue("Authorization", out string? authHeader) || string.IsNullOrEmpty(authHeader))
                {
                    return Results.BadRequest("Authorization header is required for this type of agent.");
                }
            }

            PulseAgentConfiguration config = new()
            {
                Sqid = id,
                Type = type,
                Location = request.Location,
                ApplicationName = request.ApplicationName,
                SubscriptionId = request.SubscriptionId,
                BuildDefinitionId = request.BuildDefinitionId,
                Enabled = request.Enabled,
                Headers = PulseAgentConfiguration.CreateHeaders(request.Headers)
            };

            try
            {
                await context.AgentConfigurations.UpdateEntityAsync(config, ETag.All, TableUpdateMode.Replace, token);

                logger.LogInformation(PulseEventIds.Admin, "Updated Agent Configuration {Id} of type {Type}", id, type);
                return Results.Created();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error updating Agent Configuration {Id} of type {Type}", id, type);
                return Results.Conflict();
            }
        });

        agentGroup.MapDelete("{id}/{type}", static async (string id, string type, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            var configuration = await context.AgentConfigurations.FindAsync(id, type, token);

            if (configuration is null)
            {
                return Results.NotFound();
            }

            await context.AgentConfigurations.DeleteEntityAsync(configuration, token);

            logger.LogInformation(PulseEventIds.Admin, "Deleted Agent Configuration {Id} of type {Type}", id, type);
            return Results.NoContent();
        });
    }

    private static void CreateNormalMappings(RouteGroupBuilder normalGroup)
    {
        normalGroup.MapGet("{id}", static async (string id, PulseContext context, CancellationToken token) =>
        {
            var configuration = await context.Configurations.Where(x => x.Sqid == id).FirstOrDefaultAsync(token);

            if (configuration is null)
            {
                return Results.NotFound();
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
                Headers = configuration.GetHeaders().ToDictionary(x => x.name, x => x.values)
            });
        });

        normalGroup.MapPost("", static async (PulseCreationRequest request, PulseStore store, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            if (request.Type is Checks.PulseCheckType.Json or Checks.PulseCheckType.Contains && string.IsNullOrWhiteSpace(request.ComparisonValue))
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

            try
            {
                await context.Configurations.AddEntityAsync(config, token);

                logger.LogInformation(PulseEventIds.Admin, "Created Normal Configuration {Id} of type {Type}", sqid, request.Type);
                return Results.Created();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error creating Normal Configuration");
                return Results.Conflict();
            }
        });

        normalGroup.MapPut("{id}", static async (string id, PulseCreationRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            if (request.Type is Checks.PulseCheckType.Json or Checks.PulseCheckType.Contains && string.IsNullOrWhiteSpace(request.ComparisonValue))
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

            try
            {
                await context.Configurations.UpdateEntityAsync(config, ETag.All, TableUpdateMode.Replace, token);

                logger.LogInformation(PulseEventIds.Admin, "Updated Normal Configuration {Id} of type {Type}", id, request.Type);
                return Results.Created();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error updating Normal Configuration {Id} of type {Type}", id, request.Type);
                return Results.Conflict();
            }
        });

        normalGroup.MapPut("{id}/{enabled}", static async (string id, bool enabled, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
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

                logger.LogInformation(PulseEventIds.Admin, "Updated Normal Configuration {Id} to Enabled: {Enabled}", id, enabled);
                return Results.NoContent();
            }
            catch (Exception ex)
            {
                logger.LogError(PulseEventIds.Admin, ex, "Error updating Normal Configuration {Id} to Enabled: {Enabled}", id, enabled);
                return Results.Conflict();
            }
        });

        normalGroup.MapDelete("{id}", static async (string id, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            var configuration = await context.Configurations.Where(x => x.Sqid == id).FirstOrDefaultAsync(token);

            if (configuration is null)
            {
                return Results.NotFound();
            }

            await context.Configurations.DeleteEntityAsync(configuration, token);

            logger.LogInformation(PulseEventIds.Admin, "Deleted Normal Configuration {Id}", id);
            return Results.NoContent();
        });
    }
}
