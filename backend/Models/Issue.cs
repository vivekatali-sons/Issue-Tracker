namespace DMS.API.Models;

public class Issue
{
    public int Id { get; set; }
    public string ProcessId { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; }
    public string IssueRaisedBy { get; set; } = string.Empty;
    public string IssueTitle { get; set; } = string.Empty;
    public string IssueDescription { get; set; } = string.Empty;
    public string Status { get; set; } = "New";
    public string Severity { get; set; } = string.Empty;
    public string AssignedTo { get; set; } = string.Empty;
    public DateTime? AssigningDate { get; set; }
    public DateTime? DueDate { get; set; }
    public int CurrentVersion { get; set; } = 1;
    public int ReopenCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Soft delete
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }

    // Navigation — populated by service layer
    public List<string> DependentProcesses { get; set; } = [];
    public List<FileAttachment> Attachments { get; set; } = [];
    public List<IssueVersion> Versions { get; set; } = [];
    public Resolution? Resolution { get; set; }
}
