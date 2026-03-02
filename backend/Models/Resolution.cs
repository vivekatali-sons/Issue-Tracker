namespace DMS.API.Models;

public class Resolution
{
    public int Id { get; set; }
    public int IssueId { get; set; }
    public int VersionNumber { get; set; }
    public DateTime ResolvedDate { get; set; }
    public string ResolvedBy { get; set; } = string.Empty;
    public string ResolutionNotes { get; set; } = string.Empty;
    public string RootCause { get; set; } = string.Empty;
    public string PreventiveMeasures { get; set; } = string.Empty;
    public DateTime? VerificationDate { get; set; }

    // Navigation
    public List<string> TestedBy { get; set; } = [];
    public List<DependentProcessTestResult> DependentProcessesTestResults { get; set; } = [];
}
