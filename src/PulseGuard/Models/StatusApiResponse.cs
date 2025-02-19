namespace PulseGuard.Models;

public sealed record StatusApiResponse(PulseStates Status)
{
    //public long Duration { get; set; }
    //public Dictionary<string, StatusApiDetails> Details { get; set; }
}

//public sealed record StatusApiDetails(PulseStates Status, long Duration)
//{
//    public string? Description { get; set; }
//    public Dictionary<string, bool> Data { get; set; }
//}
