using CrDev.Api.Contracts;
using CrDev.Api.Domain;

namespace CrDev.Api.Services;

public static class Mapper
{
    public static readonly Relationship Self = new("self", null);
    public static readonly Relationship None = new("none", null);

    public static UserBrief Brief(User u) => new(u.Id, u.Name, u.Headline, u.AvatarUrl);

    public static WorkInfo? Work(User u) =>
        u.WorkCompany is null && u.WorkRole is null ? null : new WorkInfo(u.WorkCompany, u.WorkRole);

    public static StudyInfo? Study(User u) =>
        u.StudyInstitution is null && u.StudyProgram is null ? null : new StudyInfo(u.StudyInstitution, u.StudyProgram);

    public static UserCard Card(User u, Relationship relationship, ISet<string> viewerSkillKeys) => new(
        u.Id, u.Name, u.Headline, u.Location, u.AvatarUrl,
        u.Skills.OrderBy(s => s.Name).Select(s => s.Name).ToList(),
        Work(u), Study(u), relationship,
        u.Skills.Count(s => viewerSkillKeys.Contains(s.Key)));

    public static UserProfile Profile(User u, Relationship relationship, int friends, int projects, int ideas, bool includeEmail) => new(
        u.Id, includeEmail ? u.Email : null, u.Name, u.Headline, u.Location, u.Bio, u.AvatarUrl,
        u.Skills.OrderBy(s => s.Name).Select(s => s.Name).ToList(),
        Work(u), Study(u),
        new LinksInfo(u.GithubUrl, u.WebsiteUrl, u.LinkedinUrl),
        u.CreatedAt, relationship, friends, projects, ideas);

    public static RoleView Role(ProjectRole r, ISet<string> viewerSkillKeys) =>
        new(r.Id, r.Title, r.SkillName, r.Description, r.IsOpen, r.IsOpen && viewerSkillKeys.Contains(r.SkillKey));

    public static MyApplication? Application(JoinRequest? r) => r is null ? null : new(r.Id, r.Status, r.RoleId);

    public static string Excerpt(string body, int max = 260)
    {
        var flat = SkillKey.CollapseSpaces(body);
        return flat.Length <= max ? flat : flat[..max].TrimEnd() + "…";
    }
}
