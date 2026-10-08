namespace CrDev.Api.Domain;

public enum ProjectStatus { Planning, Building, Paused, Launched }
public enum MediaKind { Image, Video }
public enum JoinRequestStatus { Pending, Accepted, Declined }
public enum FriendshipStatus { Pending, Accepted }
public enum CommentKind { Feedback, Help }

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Headline { get; set; }
    public string? Location { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public string? WorkCompany { get; set; }
    public string? WorkRole { get; set; }
    public string? StudyInstitution { get; set; }
    public string? StudyProgram { get; set; }
    public string? GithubUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? LinkedinUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<UserSkill> Skills { get; set; } = [];
}

/// <summary>Skill declared by a user. <see cref="Key"/> is the normalized form used for matching.</summary>
public sealed class UserSkill
{
    public Guid UserId { get; set; }
    public string Key { get; set; } = "";
    public string Name { get; set; } = "";
}

public sealed class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    public string Title { get; set; } = "";
    public string Summary { get; set; } = "";
    public string Description { get; set; } = "";
    public ProjectStatus Status { get; set; } = ProjectStatus.Planning;
    public string? RepoUrl { get; set; }
    public string? DemoUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<ProjectMedia> Media { get; set; } = [];
    public List<ProjectRole> Roles { get; set; } = [];
    public List<ProjectMember> Members { get; set; } = [];
    public List<JoinRequest> JoinRequests { get; set; } = [];
}

public sealed class ProjectMedia
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public MediaKind Kind { get; set; }
    public string Url { get; set; } = "";
    public int Position { get; set; }
}

/// <summary>A profile the project is looking for, e.g. "Músico" or "Backend".</summary>
public sealed class ProjectRole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = "";
    public string SkillKey { get; set; } = "";
    public string SkillName { get; set; } = "";
    public string? Description { get; set; }
    public bool IsOpen { get; set; } = true;
}

public sealed class ProjectMember
{
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string RoleTitle { get; set; } = "Colaborador";
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public sealed class JoinRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public Guid? RoleId { get; set; }
    public ProjectRole? Role { get; set; }
    public Guid ApplicantId { get; set; }
    public User Applicant { get; set; } = null!;
    public string Message { get; set; } = "";
    public JoinRequestStatus Status { get; set; } = JoinRequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
}

public sealed class Friendship
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RequesterId { get; set; }
    public User Requester { get; set; } = null!;
    public Guid AddresseeId { get; set; }
    public User Addressee { get; set; } = null!;
    public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class Idea
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<IdeaTag> Tags { get; set; } = [];
    public List<IdeaInterest> Interests { get; set; } = [];
    public List<IdeaComment> Comments { get; set; } = [];
}

/// <summary>Skill an idea is looking for, so it can be matched with people.</summary>
public sealed class IdeaTag
{
    public Guid IdeaId { get; set; }
    public string Key { get; set; } = "";
    public string Name { get; set; } = "";
}

public sealed class IdeaInterest
{
    public Guid IdeaId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class IdeaComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IdeaId { get; set; }
    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;
    public CommentKind Kind { get; set; }
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Uploaded image. Stored in the database because free hosting tiers have ephemeral disks.
/// </summary>
public sealed class MediaFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerId { get; set; }
    public string ContentType { get; set; } = "";
    public long Length { get; set; }
    public byte[] Data { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
