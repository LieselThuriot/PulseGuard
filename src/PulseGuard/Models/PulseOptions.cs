namespace PulseGuard.Models;

public class PulseOptions
{
    public int Interval { get; set => field = Math.Max(1, value); } = 1;
    public int CleaningInterval { get; set => field = Math.Max(1, value); } = 13;
    public int SimultaneousPulses { get; set => field = Math.Max(1, value); } = 20;
    public int? AlertThreshold { get; set; }
    public string Store { get; set; } = "";
}