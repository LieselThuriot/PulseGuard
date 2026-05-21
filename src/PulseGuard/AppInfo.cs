using System.Reflection;

namespace PulseGuard;

internal static class AppInfo
{
    public static readonly string Version =
        typeof(AppInfo).Assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion ?? "unknown";
}
