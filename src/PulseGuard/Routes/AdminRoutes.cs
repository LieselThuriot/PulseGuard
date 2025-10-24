using Azure;
using Azure.Core;
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

            await context.Webhooks.DeleteEntityAsync(webhook.Id, webhook.Secret, webhook.ETag, token);
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

            await context.Webhooks.UpdateEntityAsync(webhook, webhook.ETag, TableUpdateMode.Replace, token);
            logger.LogInformation(PulseEventIds.Admin, "Updated Webhook Entry {Id}", id);

            return Results.NoContent();
        });

        group.MapPut("{id}/{enabled}", static async (string id, bool enabled, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            var webhook = await context.Webhooks.Where(x => x.Id == id).FirstOrDefaultAsync(token);

            if (webhook is null)
            {
                return Results.NotFound();
            }

            webhook.Enabled = enabled;

            await context.Webhooks.UpdateEntityAsync(webhook, webhook.ETag, TableUpdateMode.Replace, token);
            logger.LogInformation(PulseEventIds.Admin, "Updated Webhook Entry {Id}", id);

            return Results.NoContent();
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

            await context.Webhooks.AddEntityAsync(webhook, token);
            logger.LogInformation(PulseEventIds.Admin, "Created Webhook Entry {Id}", webhook.Id);

            return Results.Created();
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
                Enabled = configuration.Enabled,
                Headers = configuration.GetHeaders().ToDictionary(x => x.name, x => x.values)
            });
        });

        agentGroup.MapPut("{id}/{type}/{enabled}", static async (string id, string type, bool enabled, PulseContext context, ILogger<Program> logger, CancellationToken token)
            => (await UpdateAgentState(id, type, enabled, context, logger, token)) ? Results.NoContent() : Results.NotFound());

        agentGroup.MapPost("{id}/{type}", static async (string id, string type, PulseAgentCreationRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            if (AgentCheckTypeFastString.FromString(type) is AgentCheckType.LogAnalyticsWorkspace && string.IsNullOrWhiteSpace(request.ApplicationName))
            {
                return Results.BadRequest("ApplicationName is required for LogAnalyticsWorkspace type.");
            }

            PulseAgentConfiguration config = new()
            {
                Sqid = id,
                Type = type,
                Location = request.Location,
                ApplicationName = request.ApplicationName,
                Enabled = request.Enabled,
                Headers = PulseAgentConfiguration.CreateHeaders(request.Headers)
            };

            await context.AgentConfigurations.AddEntityAsync(config, token);

            logger.LogInformation(PulseEventIds.Admin, "Created Agent Configuration {Id} of type {Type}", id, type);
            return Results.Created();
        });

        agentGroup.MapPut("{id}/{type}", static async (string id, string type, PulseAgentCreationRequest request, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            if (AgentCheckTypeFastString.FromString(type) is AgentCheckType.LogAnalyticsWorkspace && string.IsNullOrWhiteSpace(request.ApplicationName))
            {
                return Results.BadRequest("ApplicationName is required for LogAnalyticsWorkspace type.");
            }

            PulseAgentConfiguration config = new()
            {
                Sqid = id,
                Type = type,
                Location = request.Location,
                ApplicationName = request.ApplicationName,
                Enabled = request.Enabled,
                Headers = PulseAgentConfiguration.CreateHeaders(request.Headers)
            };

            await context.AgentConfigurations.UpdateEntityAsync(config, ETag.All, TableUpdateMode.Replace, token);

            logger.LogInformation(PulseEventIds.Admin, "Updated Agent Configuration {Id} of type {Type}", id, type);
            return Results.Created();
        });

        agentGroup.MapDelete("{id}/{type}", static async (string id, string type, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            var configuration = await context.AgentConfigurations.FindAsync(id, type, token);

            if (configuration is null)
            {
                return Results.NotFound();
            }

            await context.AgentConfigurations.DeleteEntityAsync(configuration.Sqid, configuration.Type, configuration.ETag, token);

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

            await context.Configurations.AddEntityAsync(config, token);

            logger.LogInformation(PulseEventIds.Admin, "Created Normal Configuration {Id} of type {Type}", sqid, request.Type);
            return Results.Created();
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

            await context.Configurations.UpdateEntityAsync(config, ETag.All, TableUpdateMode.Replace, token);

            logger.LogInformation(PulseEventIds.Admin, "Updated Normal Configuration {Id} of type {Type}", id, request.Type);
            return Results.Created();
        });

        normalGroup.MapPut("{id}/{enabled}", static async (string id, bool enabled, PulseContext context, ILogger<Program> logger, CancellationToken token)
            => (await UpdateNormalState(id, enabled, context, logger, token)) ? Results.NoContent() : Results.NotFound());

        normalGroup.MapDelete("{id}", static async (string id, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
        {
            var configuration = await context.Configurations.Where(x => x.Sqid == id).FirstOrDefaultAsync(token);

            if (configuration is null)
            {
                return Results.NotFound();
            }

            await context.Configurations.DeleteEntityAsync(configuration.Group, configuration.Name, configuration.ETag, token);

            logger.LogInformation(PulseEventIds.Admin, "Deleted Normal Configuration {Id}", id);
            return Results.NoContent();
        });
    }

    private static async Task<bool> UpdateNormalState(string id, bool state, PulseContext context, ILogger<Program> logger, CancellationToken token)
    {
        var config = await context.Configurations.FirstOrDefaultAsync(x => x.Sqid == id, token);
        if (config is null)
        {
            return false;
        }

        config.Enabled = state;
        await context.Configurations.UpdateEntityAsync(config, token);

        logger.LogInformation(PulseEventIds.Admin, "Updated Normal Configuration {Id} to Enabled: {Enabled}", id, state);
        return true;
    }

    private static async Task<bool> UpdateAgentState(string id, string type, bool state, PulseContext context, ILogger<Program> logger, CancellationToken token)
    {
        var config = await context.AgentConfigurations.FindAsync(id, type, token);
        if (config is null)
        {
            return false;
        }

        config.Enabled = state;
        await context.AgentConfigurations.UpdateEntityAsync(config, token);

        logger.LogInformation(PulseEventIds.Admin, "Updated Agent Configuration {Id} of type {Type} to Enabled: {Enabled}", id, type, state);
        return true;
    }
}
