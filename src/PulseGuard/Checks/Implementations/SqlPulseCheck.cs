using Microsoft.Data.SqlClient;
using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Checks.Implementations;

internal sealed class SqlPulseCheck(HttpClient client, PulseConfiguration options, ILogger<PulseCheck> logger) : PulseCheck(client, options)
{
    private readonly ILogger<PulseCheck> _logger = logger;

    protected override async Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token)
    {
        try
        {
            await using SqlConnection connection = new(Options.Location);
            await connection.OpenAsync(token).ConfigureAwait(false);

            await using SqlCommand command = connection.CreateCommand();
            command.CommandText = "SELECT 1;";
            command.CommandTimeout = Options.Timeout / 1000;

            _ = await command.ExecuteScalarAsync(token);

            _logger.LogInformation(PulseEventIds.HealthApiCheck, "Pulse check completed and is considered Healthy");
            return PulseReport.Success(Options);
        }
        catch (SqlException ex)
        {
            return ex.Number switch
            {
                -2 => PulseReport.TimedOut(Options),
                _ => PulseReport.Fail(Options, "Pulse check failed due to SQL exception", ex.Message)
            };
        }
    }
}
