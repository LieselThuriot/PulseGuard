using System.ComponentModel.DataAnnotations;

namespace PulseGuard.Models;

public sealed class PulseDataProtectionOptions
{
    public const string SectionName = "DataProtection";

    [Required]
    public Uri BlobUri { get; set; } = default!;

    [Required]
    public Uri KeyId { get; set; } = default!;
}
