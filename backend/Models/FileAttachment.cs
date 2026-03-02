namespace DMS.API.Models;

public class FileAttachment
{
    public int Id { get; set; }
    public int IssueId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string DataUrl { get; set; } = string.Empty;
}
