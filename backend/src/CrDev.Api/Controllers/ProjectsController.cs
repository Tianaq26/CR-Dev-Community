using CrDev.Api.Contracts;
using CrDev.Api.Data;
using CrDev.Api.Domain;
using CrDev.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Controllers;

public sealed class ProjectListQuery
{
    /// <summary>recent (default), foryou (open roles that match my skills) or friends.</summary>
    public string? Feed { get; init; }
    public string? Q { get; init; }
    public string? Skill { get; init; }
    public Guid? OwnerId { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 12;
}

[Route("api/projects")]
public sealed class ProjectsController(AppDbContext db, RelationshipService relations) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<Paged<ProjectCard>>> List([FromQuery] ProjectListQuery filter)
    {
        var me = UserId;
        var page = ClampPage(filter.Page);
        var pageSize = ClampSize(filter.PageSize, 30);
        var myKeys = await relations.SkillKeys(me);
        var keyArray = myKeys.ToArray();

        IQueryable<Project> query = db.Projects.AsNoTracking();

        if (filter.OwnerId is { } ownerId) query = query.Where(p => p.OwnerId == ownerId);

        var feed = filter.Feed?.ToLowerInvariant();
        if (feed == "foryou")
        {
            query = query.Where(p => p.OwnerId != me && p.Roles.Any(r => r.IsOpen && keyArray.Contains(r.SkillKey)));
        }
        else if (feed == "friends")
        {
            var friendIds = await relations.FriendIds(me);
            query = query.Where(p => friendIds.Contains(p.OwnerId));
        }

        if (!string.IsNullOrWhiteSpace(filter.Q))
        {
            var term = filter.Q.Trim().ToLower();
            query = query.Where(p => p.Title.ToLower().Contains(term)
                || p.Summary.ToLower().Contains(term)
                || p.Roles.Any(r => r.SkillName.ToLower().Contains(term) || r.Title.ToLower().Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(filter.Skill))
        {
            var key = SkillKey.Of(filter.Skill);
            query = query.Where(p => p.Roles.Any(r => r.IsOpen && r.SkillKey == key));
        }

        var total = await query.CountAsync();

        var ordered = feed == "foryou"
            ? query.OrderByDescending(p => p.Roles.Count(r => r.IsOpen && keyArray.Contains(r.SkillKey))).ThenByDescending(p => p.CreatedAt)
            : query.OrderByDescending(p => p.CreatedAt);

        var rows = await ordered.ThenBy(p => p.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new
            {
                p.Id, p.Title, p.Summary, p.Status, p.CreatedAt,
                OwnerId = p.Owner.Id, OwnerName = p.Owner.Name, OwnerHeadline = p.Owner.Headline, OwnerAvatar = p.Owner.AvatarUrl,
                Cover = p.Media.Where(m => m.Kind == MediaKind.Image).OrderBy(m => m.Position).Select(m => m.Url).FirstOrDefault(),
                Roles = p.Roles.OrderBy(r => r.Title).ToList(),
                Members = p.Members.Count,
            })
            .ToListAsync();

        var items = rows.Select(r =>
        {
            var roles = r.Roles.Select(x => Mapper.Role(x, myKeys)).ToList();
            return new ProjectCard(
                r.Id, r.Title, r.Summary, r.Status, r.CreatedAt,
                new UserBrief(r.OwnerId, r.OwnerName, r.OwnerHeadline, r.OwnerAvatar),
                r.Cover, roles, r.Members + 1, roles.Count(x => x.IsMatch));
        }).ToList();

        return new Paged<ProjectCard>(items, page, pageSize, total);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDetail>> Get(Guid id)
    {
        var me = UserId;
        var project = await LoadDetail(id);
        if (project is null) return Fail(StatusCodes.Status404NotFound, "No encontramos ese proyecto.");
        return await ToDetail(project, me);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDetail>> Create(ProjectUpsertRequest req)
    {
        var project = new Project { OwnerId = UserId };
        var error = Apply(project, req);
        if (error is not null) return error;

        db.Projects.Add(project);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = project.Id }, await ToDetail((await LoadDetail(project.Id))!, UserId));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProjectDetail>> Update(Guid id, ProjectUpsertRequest req)
    {
        var me = UserId;
        var project = await db.Projects
            .Include(p => p.Media).Include(p => p.Roles)
            .AsSplitQuery()
            .FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return Fail(StatusCodes.Status404NotFound, "No encontramos ese proyecto.");
        if (project.OwnerId != me) return Fail(StatusCodes.Status403Forbidden, "Solo quien creó el proyecto puede editarlo.");

        var error = Apply(project, req);
        if (error is not null) return error;

        await db.SaveChangesAsync();
        return await ToDetail((await LoadDetail(id))!, me);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NoContent();
        if (project.OwnerId != UserId) return Fail(StatusCodes.Status403Forbidden, "Solo quien creó el proyecto puede borrarlo.");
        db.Projects.Remove(project);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>For the owner: people whose skills fit each open role.</summary>
    [HttpGet("{id:guid}/suggestions")]
    public async Task<ActionResult<IReadOnlyList<RoleSuggestions>>> Suggestions(Guid id)
    {
        var me = UserId;
        var project = await db.Projects.AsNoTracking().Include(p => p.Roles).Include(p => p.Members)
            .AsSplitQuery().FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return Fail(StatusCodes.Status404NotFound, "No encontramos ese proyecto.");
        if (project.OwnerId != me) return Fail(StatusCodes.Status403Forbidden, "Solo quien creó el proyecto ve estas sugerencias.");

        var exclude = project.Members.Select(m => m.UserId).Append(me).ToList();
        var myKeys = await relations.SkillKeys(me);
        var result = new List<RoleSuggestions>();

        foreach (var role in project.Roles.Where(r => r.IsOpen).OrderBy(r => r.Title))
        {
            var key = role.SkillKey;
            var users = await db.Users.AsNoTracking().Include(u => u.Skills)
                .Where(u => !exclude.Contains(u.Id) && u.Skills.Any(s => s.Key == key))
                .OrderByDescending(u => u.CreatedAt).Take(6)
                .AsSplitQuery().ToListAsync();
            var rels = await relations.For(me, users.Select(u => u.Id));
            result.Add(new RoleSuggestions(role.Id, role.Title, role.SkillName,
                users.Select(u => Mapper.Card(u, rels[u.Id], myKeys)).ToList()));
        }
        return result;
    }

    [HttpGet("{id:guid}/requests")]
    public async Task<ActionResult<IReadOnlyList<JoinRequestReceived>>> Requests(Guid id)
    {
        var project = await db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return Fail(StatusCodes.Status404NotFound, "No encontramos ese proyecto.");
        if (project.OwnerId != UserId) return Fail(StatusCodes.Status403Forbidden, "Solo quien creó el proyecto ve las solicitudes.");
        return await InboxController.ReceivedFor(db, q => q.Where(r => r.ProjectId == id));
    }

    [HttpPost("{id:guid}/apply")]
    public async Task<ActionResult<MyApplication>> ApplyToJoin(Guid id, ApplyRequest req)
    {
        var me = UserId;
        var project = await db.Projects.Include(p => p.Roles).Include(p => p.Members)
            .AsSplitQuery().FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return Fail(StatusCodes.Status404NotFound, "No encontramos ese proyecto.");
        if (project.OwnerId == me) return Fail(StatusCodes.Status400BadRequest, "Este proyecto es tuyo.");
        if (project.Members.Any(m => m.UserId == me)) return Fail(StatusCodes.Status409Conflict, "Ya eres parte de este proyecto.");

        ProjectRole? role = null;
        if (req.RoleId is { } roleId)
        {
            role = project.Roles.FirstOrDefault(r => r.Id == roleId);
            if (role is null) return Invalid(nameof(req.RoleId), "Ese puesto no existe en el proyecto.");
            if (!role.IsOpen) return Fail(StatusCodes.Status409Conflict, "Ese puesto ya está cubierto.");
        }

        if (await db.JoinRequests.AnyAsync(r => r.ProjectId == id && r.ApplicantId == me && r.Status == JoinRequestStatus.Pending))
            return Fail(StatusCodes.Status409Conflict, "Ya tienes una solicitud pendiente en este proyecto.");

        var request = new JoinRequest
        {
            ProjectId = id, RoleId = role?.Id, ApplicantId = me, Message = req.Message.Trim(),
        };
        db.JoinRequests.Add(request);
        await db.SaveChangesAsync();
        return new MyApplication(request.Id, request.Status, request.RoleId);
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
    {
        var me = UserId;
        var project = await db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return Fail(StatusCodes.Status404NotFound, "No encontramos ese proyecto.");
        if (project.OwnerId != me && userId != me)
            return Fail(StatusCodes.Status403Forbidden, "No puedes quitar a esta persona.");

        var member = await db.ProjectMembers.FirstOrDefaultAsync(m => m.ProjectId == id && m.UserId == userId);
        if (member is not null)
        {
            db.ProjectMembers.Remove(member);
            await db.SaveChangesAsync();
        }
        return NoContent();
    }

    // ---- helpers ---------------------------------------------------------------------------

    private Task<Project?> LoadDetail(Guid id) =>
        db.Projects.AsNoTracking()
            .Include(p => p.Owner).Include(p => p.Media).Include(p => p.Roles)
            .Include(p => p.Members).ThenInclude(m => m.User)
            .AsSplitQuery()
            .FirstOrDefaultAsync(p => p.Id == id);

    private async Task<ProjectDetail> ToDetail(Project p, Guid me)
    {
        var myKeys = await relations.SkillKeys(me);
        var isOwner = p.OwnerId == me;

        var mine = await db.JoinRequests.AsNoTracking()
            .Where(r => r.ProjectId == p.Id && r.ApplicantId == me)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();

        var pending = isOwner
            ? await db.JoinRequests.CountAsync(r => r.ProjectId == p.Id && r.Status == JoinRequestStatus.Pending)
            : 0;

        return new ProjectDetail(
            p.Id, p.Title, p.Summary, p.Description, p.Status, p.RepoUrl, p.DemoUrl, p.CreatedAt, p.UpdatedAt,
            Mapper.Brief(p.Owner),
            p.Media.OrderBy(m => m.Position).Select(m => new MediaView(m.Id, m.Kind, m.Url)).ToList(),
            p.Roles.OrderBy(r => r.Title).Select(r => Mapper.Role(r, myKeys)).ToList(),
            p.Members.OrderBy(m => m.JoinedAt).Select(m => new MemberView(Mapper.Brief(m.User), m.RoleTitle, m.JoinedAt)).ToList(),
            isOwner,
            p.Members.Any(m => m.UserId == me),
            Mapper.Application(mine),
            pending);
    }

    /// <summary>Copies the request onto the project (tracked), returning an error result if invalid.</summary>
    private ActionResult? Apply(Project project, ProjectUpsertRequest req)
    {
        var repo = UrlRules.OptionalHttp(req.RepoUrl, out var repoError);
        if (repoError) return Invalid(nameof(req.RepoUrl), "El enlace del repositorio debe empezar con http:// o https://");
        var demo = UrlRules.OptionalHttp(req.DemoUrl, out var demoError);
        if (demoError) return Invalid(nameof(req.DemoUrl), "El enlace de la demo debe empezar con http:// o https://");

        var media = new List<ProjectMedia>();
        foreach (var (item, index) in (req.Media ?? []).Select((m, i) => (m, i)))
        {
            var url = item.Url.Trim();
            var ok = item.Kind == MediaKind.Image ? UrlRules.IsImage(url) : UrlRules.IsHttp(url);
            if (!ok) return Invalid(nameof(req.Media), item.Kind == MediaKind.Image
                ? "Una de las imágenes no es válida."
                : "Los videos deben ser un enlace http(s), por ejemplo de YouTube o Vimeo.");
            media.Add(new ProjectMedia { Kind = item.Kind, Url = url, Position = index });
        }

        var roleInputs = req.Roles ?? [];
        var roles = new List<(RoleInput Input, string Key, string Name)>();
        foreach (var input in roleInputs)
        {
            var cleaned = SkillKey.Clean([input.Skill], 1);
            if (cleaned.Count == 0) return Invalid(nameof(req.Roles), "Cada puesto necesita una habilidad (máximo 40 caracteres).");
            roles.Add((input, cleaned[0].Key, cleaned[0].Name));
        }

        project.Title = SkillKey.CollapseSpaces(req.Title);
        project.Summary = SkillKey.CollapseSpaces(req.Summary);
        project.Description = (req.Description ?? "").Trim();
        project.Status = req.Status;
        project.RepoUrl = repo;
        project.DemoUrl = demo;
        project.UpdatedAt = DateTime.UtcNow;

        // Media is replaced wholesale; nothing else points at it.
        project.Media.Clear();
        project.Media.AddRange(media);

        // Roles keep their identity (applications point at them) when the client sends the id back.
        var keepIds = roles.Where(r => r.Input.Id.HasValue).Select(r => r.Input.Id!.Value).ToHashSet();
        project.Roles.RemoveAll(r => !keepIds.Contains(r.Id));
        foreach (var (input, key, name) in roles)
        {
            var title = UrlRules.Blank(input.Title) ?? name;
            var description = UrlRules.Blank(input.Description);
            var existing = input.Id is { } rid ? project.Roles.FirstOrDefault(r => r.Id == rid) : null;
            if (existing is null)
            {
                project.Roles.Add(new ProjectRole
                {
                    Title = title, SkillKey = key, SkillName = name, Description = description, IsOpen = input.IsOpen,
                });
            }
            else
            {
                existing.Title = title;
                existing.SkillKey = key;
                existing.SkillName = name;
                existing.Description = description;
                existing.IsOpen = input.IsOpen;
            }
        }
        return null;
    }
}
