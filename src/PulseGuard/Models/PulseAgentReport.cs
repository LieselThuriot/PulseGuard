using PulseGuard.Entities;

namespace PulseGuard.Models;

public sealed record PulseAgentReport(PulseAgentConfiguration Options, double? CpuPercentage, double? Memory);