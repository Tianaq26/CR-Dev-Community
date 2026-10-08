using CrDev.Api.Contracts;
using CrDev.Api.Data;
using CrDev.Api.Domain;
using CrDev.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Controllers;

[Route("api")]
public sealed class ProfileController(AppDbContext db, RelationshipService relations) : ApiControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<UserProfile>> Me()
    {
        var user = await db.Users.AsNoTracking().Include(u => u.Skills).FirstOrDefaultAsync(u => u.Id == UserId);
        if (user is null) return Fail(StatusCodes.Status401Unauthorized, "Sesión no válida.");
        return await ProfileBuilder.ForSelf(db, user);
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserProfile>> UpdateMe(UpdateProfileRequest req)
    {
        var user = await db.Users.Include(u => u.Skills).FirstOrDefaultAsync(u => u.Id == UserId);
        if (user is null) return Fail(StatusCodes.Status401Unauthorized, "Sesión no válida.");

        var github = UrlRules.OptionalHttp(req.GithubUrl, out var e1);
        var website = UrlRules.OptionalHttp(req.WebsiteUrl, out var e2);
        var linkedin = UrlRules.OptionalHttp(req.LinkedinUrl, out var e3);
        if (e1) return Invalid(nameof(req.GithubUrl), "El enlace de GitHub debe empezar con http:// o https://");
        if (e2) return Invalid(nameof(req.WebsiteUrl), "El enlace del sitio debe empezar con http:// o https://");
        if (e3) return Invalid(nameof(req.LinkedinUrl), "El enlace de LinkedIn debe empezar con http:// o https://");

        var avatar = req.AvatarUrl?.Trim();
        if (!string.IsNullOrEmpty(avatar) && !UrlRules.IsImage(avatar))
            return Invalid(nameof(req.AvatarUrl), "La foto debe ser una imagen subida o un enlace http(s).");

        user.Name = SkillKey.CollapseSpaces(req.Name);
        if (user.Name.Length < 2) return Invalid(nameof(req.Name), "Escribe tu nombre.");
        user.Headline = UrlRules.Blank(req.Headline);
        user.Location = UrlRules.Blank(req.Location);
        user.Bio = string.IsNullOrWhiteSpace(req.Bio) ? null : req.Bio.Trim();
        user.AvatarUrl = string.IsNullOrEmpty(avatar) ? null : avatar;
        user.WorkCompany = UrlRules.Blank(req.WorkCompany);
        user.WorkRole = UrlRules.Blank(req.WorkRole);
        user.StudyInstitution = UrlRules.Blank(req.StudyInstitution);
        user.StudyProgram = UrlRules.Blank(req.StudyProgram);
        user.GithubUrl = github;
        user.WebsiteUrl = website;
        user.LinkedinUrl = linkedin;

        var wanted = SkillKey.Clean(req.Skills, 20);
        user.Skills.RemoveAll(s => wanted.All(w => w.Key != s.Key));
        foreach (var (key, name) in wanted)
        {
            var existing = user.Skills.FirstOrDefault(s => s.Key == key);
            if (existing is null) user.Skills.Add(new UserSkill { UserId = user.Id, Key = key, Name = name });
            else existing.Name = name;
        }

        await db.SaveChangesAsync();
        return await ProfileBuilder.ForSelf(db, user);
    }

    [HttpGet("users")]
    public async Task<ActionResult<Paged<UserCard>>> Search(
        [FromQuery] string? q, [FromQuery] string? skill, [FromQuery] int page = 1, [FromQuery] int pageSize = 18)
    {
        var me = UserId;
        page = ClampPage(page);
        pageSize = ClampSize(pageSize);

        var query = db.Users.AsNoTracking().Where(u => u.Id != me);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(u => u.Name.ToLower().Contains(term)
                || (u.Headline != null && u.Headline.ToLower().Contains(term))
                || (u.Location != null && u.Location.ToLower().Contains(term))
                || u.Skills.Any(s => s.Name.ToLower().Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(skill))
        {
            var key = SkillKey.Of(skill);
            query = query.Where(u => u.Skills.Any(s => s.Key == key));
        }

        var total = await query.CountAsync();
        var users = await query.Include(u => u.Skills)
            .OrderBy(u => u.Name).ThenBy(u => u.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .AsSplitQuery()
            .ToListAsync();

        var myKeys = await relations.SkillKeys(me);
        var rels = await relations.For(me, users.Select(u => u.Id));
        var items = users.Select(u => Mapper.Card(u, rels[u.Id], myKeys)).ToList();
        return new Paged<UserCard>(items, page, pageSize, total);
    }

    [HttpGet("users/{id:guid}")]
    public async Task<ActionResult<UserProfile>> GetUser(Guid id)
    {
        var user = await db.Users.AsNoTracking().Include(u => u.Skills).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return Fail(StatusCodes.Status404NotFound, "No encontramos a esa persona.");
        var relationship = await relations.With(UserId, id);
        return await ProfileBuilder.Build(db, user, relationship, includeEmail: id == UserId);
    }
}
