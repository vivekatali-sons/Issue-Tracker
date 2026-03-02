namespace DMS.API.Models;

public class DependentProcessTestResult
{
    public int Id { get; set; }
    public int? ResolutionId { get; set; }
    public int? VersionId { get; set; }
    public string ProcessId { get; set; } = string.Empty;
    public bool Tested { get; set; }
    public DateTime? TestDate { get; set; }

    // Navigation
    public List<string> TestedBy { get; set; } = [];
}
