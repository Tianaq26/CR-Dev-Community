using CrDev.Api.Contracts;
using CrDev.Api.Data;
using CrDev.Api.Domain;
using CrDev.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Controllers;

public sealed class IdeaListQuery
{
    /// <summary>recent (default), foryou (tags match my skills) or friends.</summary>
    public string? Feed { get; init; }
    public string? Q { get; init; }
    public Guid? AuthorId { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 12;
}

[Route("api/ideas")]
public sealed class IdeasController(AppDbContext db, RelationshipService relations) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<Paged<IdeaCard>>> List([FromQuery] IdeaListQuery filter)
    {
        var me = UserId;
        var page = ClampPage(filter.Page);
        var pageSize = ClampSize(filter.PageSize, 30);
        var myKeys = await relations.SkillKeys(me);
        var keyArray = myKeys.ToArray();

        IQueryable<Idea> query = db.Ideas.AsNoTracking();
        if (filter.AuthorId is { } authorId) query = query.Where(i => i.AuthorId == authorId);

        var feed = filter.Feed?.ToLowerInvariant();
        if (feed == "foryou")
        {
            query = query.Where(i => i.AuthorId != me && i.Tags.Any(t => keyArray.Contains(t.Key)));
        }
        else if (feed == "friends")
        {
            var friendIds = await relations.FriendIds(me);
            query = query.Where(i => friendIds.Contains(i.AuthorId));
        }

        if (!string.IsNullOrWhiteSpace(filter.Q))
        {
            var term = filter.Q.Trim().ToLower();
            query = query.Where(i => i.Title.ToLower().Contains(term)
                || i.Body.ToLower().Contains(term)
                || i.Tags.Any(t => t.Name.ToLower().Contains(term)));
        }

        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(i => i.CreatedAt).ThenBy(i => i.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(i => new
            {
                i.Id, i.Title, i.Body, i.CreatedAt,
                AuthorId = i.Author.Id, AuthorName = i.Author.Name, AuthorHeadline = i.Author.Headline, AuthorAvatar = i.Author.AvatarUrl,
                Tags = i.Tags.Select(t => new { t.Name, t.Key }).ToList(),
                Interest = i.Interests.Count,
                Interested = i.Interests.Any(x => x.UserId == me),
                Feedback = i.Comments.Count(c => c.Kind == CommentKind.Feedback),
                Help = i.Comments.Count(c => c.Kind == CommentKind.Help),
            })
            .ToListAsync();

        var items = rows.Select(r => new IdeaCard(
            r.Id, r.Title, Mapper.Excerpt(r.Body),
            r.Tags.OrderBy(t => t.Name).Select(t => t.Name).ToList(),
            new UserBrief(r.AuthorId, r.AuthorName, r.AuthorHeadline, r.AuthorAvatar),
            r.CreatedAt, r.Interest, r.Feedback, r.Help, r.Interested,
            r.AuthorId != me && r.Tags.Any(t => myKeys.Contains(t.Key)))).ToList();

        return new Paged<IdeaCard>(items, page, pageSize, total);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<IdeaDetail>> Get(Guid id)
    {
        var detail = await LoadDetail(id, UserId);
        return detail is null ? Fail(StatusCodes.Status404NotFound, "No encontramos esa idea.") : detail;
    }

    [HttpPost]
    public async Task<ActionResult<IdeaDetail>> Create(IdeaUpsertRequest req)
    {
        var idea = new Idea { AuthorId = UserId };
        Apply(idea, req);
        db.Ideas.Add(idea);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = idea.Id }, await LoadDetail(idea.Id, UserId));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<IdeaDetail>> Update(Guid id, IdeaUpsertRequest req)
    {
        var idea = await db.Ideas.Include(i => i.Tags).FirstOrDefaultAsync(i => i.Id == id);
        if (idea is null) return Fail(StatusCodes.Status404NotFound, "No encontramos esa idea.");
        if (idea.AuthorId != UserId) return Fail(StatusCodes.Status403Forbidden, "Solo quien publicó la idea puede editarla.");
        Apply(idea, req);
        await db.SaveChangesAsync();
        return await LoadDetail(id, UserId) ?? (ActionResult<IdeaDetail>)NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var idea = await db.Ideas.FirstOrDefaultAsync(i => i.Id == id);
        if (idea is null) return NoContent();
        if (idea.AuthorId != UserId) return Fail(StatusCodes.Status403Forbidden, "Solo quien publicó la idea puede borrarla.");
        db.Ideas.Remove(idea);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:guid}/interest")]
    public Task<ActionResult<InterestState>> Interest(Guid id) => SetInterest(id, true);

    [HttpDelete("{id:guid}/interest")]
    public Task<ActionResult<InterestState>> RemoveInterest(Guid id) => SetInterest(id, false);

    [HttpPost("{id:guid}/comments")]
    public async Task<ActionResult<CommentView>> AddComment(Guid id, CommentCreate req)
    {
        var me = UserId;
        if (!await db.Ideas.AnyAsync(i => i.Id == id)) return Fail(StatusCodes.Status404NotFound, "No encontramos esa idea.");

        var comment = new IdeaComment { IdeaId = id, AuthorId = me, Kind = req.Kind, Body = req.Body.Trim() };
        db.IdeaComments.Add(comment);
        await db.SaveChangesAsync();

        var author = await db.Users.AsNoTracking().FirstAsync(u => u.Id == me);
        return CreatedAtAction(nameof(Get), new { id }, new CommentView(comment.Id, comment.Kind, comment.Body, Mapper.Brief(author), comment.CreatedAt, true));
    }

    [HttpDelete("{id:guid}/comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid id, Guid commentId)
    {
        var me = UserId;
        var comment = await db.IdeaComments.Include(c => c.Author).FirstOrDefaultAsync(c => c.Id == commentId && c.IdeaId == id);
        if (comment is null) return NoContent();

        var ideaAuthorId = await db.Ideas.Where(i => i.Id == id).Select(i => i.AuthorId).FirstAsync();
        if (comment.AuthorId != me && ideaAuthorId != me)
            return Fail(StatusCodes.Status403Forbidden, "No puedes borrar este comentario.");

        db.IdeaComments.Remove(comment);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ---- helpers ---------------------------------------------------------------------------

    private async Task<ActionResult<InterestState>> SetInterest(Guid id, bool on)
    {
        var me = UserId;
        if (!await db.Ideas.AnyAsync(i => i.Id == id)) return Fail(StatusCodes.Status404NotFound, "No encontramos esa idea.");

        var existing = await db.IdeaInterests.FirstOrDefaultAsync(x => x.IdeaId == id && x.UserId == me);
        if (on && existing is null) db.IdeaInterests.Add(new IdeaInterest { IdeaId = id, UserId = me });
        if (!on && existing is not null) db.IdeaInterests.Remove(existing);
        await db.SaveChangesAsync();

        return new InterestState(on, await db.IdeaInterests.CountAsync(x => x.IdeaId == id));
    }

    private async Task<IdeaDetail?> LoadDetail(Guid id, Guid me)
    {
        var idea = await db.Ideas.AsNoTracking()
            .Include(i => i.Author).Include(i => i.Tags).Include(i => i.Interests)
            .Include(i => i.Comments).ThenInclude(c => c.Author)
            .AsSplitQuery()
            .FirstOrDefaultAsync(i => i.Id == id);
        if (idea is null) return null;

        var comments = idea.Comments.OrderBy(c => c.CreatedAt)
            .Select(c => new CommentView(c.Id, c.Kind, c.Body, Mapper.Brief(c.Author), c.CreatedAt,
                c.AuthorId == me || idea.AuthorId == me))
            .ToList();

        return new IdeaDetail(
            idea.Id, idea.Title, idea.Body,
            idea.Tags.OrderBy(t => t.Name).Select(t => t.Name).ToList(),
            Mapper.Brief(idea.Author), idea.CreatedAt,
            idea.Interests.Count, idea.Interests.Any(x => x.UserId == me),
            idea.AuthorId == me, comments);
    }

    private static void Apply(Idea idea, IdeaUpsertRequest req)
    {
        idea.Title = SkillKey.CollapseSpaces(req.Title);
        idea.Body = req.Body.Trim();

        var wanted = SkillKey.Clean(req.Tags, 8);
        idea.Tags.RemoveAll(t => wanted.All(w => w.Key != t.Key));
        foreach (var (key, name) in wanted)
        {
            var existing = idea.Tags.FirstOrDefault(t => t.Key == key);
            if (existing is null) idea.Tags.Add(new IdeaTag { Key = key, Name = name });
            else existing.Name = name;
        }
    }
}
