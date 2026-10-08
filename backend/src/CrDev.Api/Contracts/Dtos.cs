using CrDev.Api.Domain;

namespace CrDev.Api.Contracts;

public sealed record Paged<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total)
{
    public bool HasMore => (long)Page * PageSize < Total;
}

// ---- People -------------------------------------------------------------------------------

public sealed record UserBrief(Guid Id, string Name, string? Headline, string? AvatarUrl);

/// <summary>State is one of: self, none, friends, requestSent, requestReceived.</summary>
public sealed record Relationship(string State, Guid? RequestId);

public sealed record WorkInfo(string? Company, string? Role);
public sealed record StudyInfo(string? Institution, string? Program);
public sealed record LinksInfo(string? Github, string? Website, string? Linkedin);

public sealed record UserCard(
    Guid Id,
    string Name,
    string? Headline,
    string? Location,
    string? AvatarUrl,
    IReadOnlyList<string> Skills,
    WorkInfo? Work,
    StudyInfo? Study,
    Relationship Relationship,
    int SharedSkills);

public sealed record UserProfile(
    Guid Id,
    string? Email,
    string Name,
    string? Headline,
    string? Location,
    string? Bio,
    string? AvatarUrl,
    IReadOnlyList<string> Skills,
    WorkInfo? Work,
    StudyInfo? Study,
    LinksInfo Links,
    DateTime CreatedAt,
    Relationship Relationship,
    int FriendsCount,
    int ProjectsCount,
    int IdeasCount);

public sealed record AuthResponse(string Token, UserProfile User);

// ---- Projects -----------------------------------------------------------------------------

public sealed record RoleView(Guid Id, string Title, string Skill, string? Description, bool IsOpen, bool IsMatch);

public sealed record ProjectCard(
    Guid Id,
    string Title,
    string Summary,
    ProjectStatus Status,
    DateTime CreatedAt,
    UserBrief Owner,
    string? CoverUrl,
    IReadOnlyList<RoleView> Roles,
    int MembersCount,
    int MatchCount);

public sealed record MediaView(Guid Id, MediaKind Kind, string Url);
public sealed record MemberView(UserBrief User, string RoleTitle, DateTime JoinedAt);
public sealed record MyApplication(Guid Id, JoinRequestStatus Status, Guid? RoleId);

public sealed record ProjectDetail(
    Guid Id,
    string Title,
    string Summary,
    string Description,
    ProjectStatus Status,
    string? RepoUrl,
    string? DemoUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    UserBrief Owner,
    IReadOnlyList<MediaView> Media,
    IReadOnlyList<RoleView> Roles,
    IReadOnlyList<MemberView> Members,
    bool IsOwner,
    bool IsMember,
    MyApplication? MyApplication,
    int PendingRequests);

public sealed record RoleSuggestions(Guid RoleId, string RoleTitle, string Skill, IReadOnlyList<UserCard> People);

// ---- Requests inbox -----------------------------------------------------------------------

public sealed record FriendRequestView(Guid Id, UserBrief User, DateTime CreatedAt);
public sealed record FriendRequestsView(IReadOnlyList<FriendRequestView> Incoming, IReadOnlyList<FriendRequestView> Outgoing);

public sealed record JoinRequestReceived(
    Guid Id,
    Guid ProjectId,
    string ProjectTitle,
    string? RoleTitle,
    UserBrief Applicant,
    IReadOnlyList<string> ApplicantSkills,
    string Message,
    DateTime CreatedAt);

public sealed record JoinRequestSent(
    Guid Id,
    Guid ProjectId,
    string ProjectTitle,
    string? RoleTitle,
    JoinRequestStatus Status,
    DateTime CreatedAt,
    DateTime? RespondedAt);

public sealed record InboxView(
    IReadOnlyList<FriendRequestView> FriendRequests,
    IReadOnlyList<JoinRequestReceived> Received,
    IReadOnlyList<JoinRequestSent> Sent,
    int Pending);

// ---- Ideas --------------------------------------------------------------------------------

public sealed record IdeaCard(
    Guid Id,
    string Title,
    string Excerpt,
    IReadOnlyList<string> Tags,
    UserBrief Author,
    DateTime CreatedAt,
    int Interest,
    int FeedbackCount,
    int HelpCount,
    bool Interested,
    bool IsMatch);

public sealed record CommentView(Guid Id, CommentKind Kind, string Body, UserBrief Author, DateTime CreatedAt, bool CanDelete);

public sealed record IdeaDetail(
    Guid Id,
    string Title,
    string Body,
    IReadOnlyList<string> Tags,
    UserBrief Author,
    DateTime CreatedAt,
    int Interest,
    bool Interested,
    bool IsOwner,
    IReadOnlyList<CommentView> Comments);

public sealed record InterestState(bool Interested, int Interest);

// ---- Misc ---------------------------------------------------------------------------------

public sealed record MediaUploadResponse(Guid Id, string Url);
public sealed record StatsView(int Members, int Projects, int Ideas);
