namespace DMS.API.Models;

public class IssueVersion
{
    public int Id { get; set; }
    public int IssueId { get; set; }
    public int VersionNumber { get; set; }
    public DateTime CreatedDate { get; set; }
    public string AssignedTo { get; set; } = string.Empty;
    public DateTime? AssigningDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ReopenReason { get; set; }
    public string? ChangesSummary { get; set; }
    public string? ModifiedBy { get; set; }

    // Navigation
    public List<DependentProcessTestResult> DependentProcessesTested { get; set; } = [];
    public Resolution? Resolution { get; set; }
}
