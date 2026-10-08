using System.ComponentModel.DataAnnotations;
using CrDev.Api.Domain;

namespace CrDev.Api.Contracts;

public sealed class RegisterRequest
{
    [Required, StringLength(80, MinimumLength = 2)] public string Name { get; init; } = "";
    [Required, EmailAddress, StringLength(254)] public string Email { get; init; } = "";
    [Required, StringLength(128, MinimumLength = 8)] public string Password { get; init; } = "";
}

public sealed class LoginRequest
{
    [Required, StringLength(254)] public string Email { get; init; } = "";
    [Required, StringLength(128)] public string Password { get; init; } = "";
}

public sealed class UpdateProfileRequest
{
    [Required, StringLength(80, MinimumLength = 2)] public string Name { get; init; } = "";
    [StringLength(120)] public string? Headline { get; init; }
    [StringLength(100)] public string? Location { get; init; }
    [StringLength(2000)] public string? Bio { get; init; }
    [StringLength(600)] public string? AvatarUrl { get; init; }
    [StringLength(100)] public string? WorkCompany { get; init; }
    [StringLength(100)] public string? WorkRole { get; init; }
    [StringLength(100)] public string? StudyInstitution { get; init; }
    [StringLength(100)] public string? StudyProgram { get; init; }
    [StringLength(300)] public string? GithubUrl { get; init; }
    [StringLength(300)] public string? WebsiteUrl { get; init; }
    [StringLength(300)] public string? LinkedinUrl { get; init; }
    [MaxLength(30)] public List<string>? Skills { get; init; }
}

public sealed class MediaInput
{
    public MediaKind Kind { get; init; }
    [Required, StringLength(600)] public string Url { get; init; } = "";
}

public sealed class RoleInput
{
    public Guid? Id { get; init; }
    [StringLength(80)] public string? Title { get; init; }
    [Required, StringLength(40)] public string Skill { get; init; } = "";
    [StringLength(400)] public string? Description { get; init; }
    public bool IsOpen { get; init; } = true;
}

public sealed class ProjectUpsertRequest
{
    [Required, StringLength(120, MinimumLength = 3)] public string Title { get; init; } = "";
    [Required, StringLength(280, MinimumLength = 10)] public string Summary { get; init; } = "";
    [StringLength(8000)] public string? Description { get; init; }
    public ProjectStatus Status { get; init; } = ProjectStatus.Planning;
    [StringLength(300)] public string? RepoUrl { get; init; }
    [StringLength(300)] public string? DemoUrl { get; init; }
    [MaxLength(12)] public List<MediaInput>? Media { get; init; }
    [MaxLength(10)] public List<RoleInput>? Roles { get; init; }
}

public sealed class ApplyRequest
{
    public Guid? RoleId { get; init; }
    [Required, StringLength(1000, MinimumLength = 5)] public string Message { get; init; } = "";
}

public sealed class FriendRequestCreate
{
    public Guid UserId { get; init; }
}

public sealed class IdeaUpsertRequest
{
    [Required, StringLength(140, MinimumLength = 3)] public string Title { get; init; } = "";
    [Required, StringLength(5000, MinimumLength = 10)] public string Body { get; init; } = "";
    [MaxLength(8)] public List<string>? Tags { get; init; }
}

public sealed class CommentCreate
{
    public CommentKind Kind { get; init; }
    [Required, StringLength(2000, MinimumLength = 2)] public string Body { get; init; } = "";
}
