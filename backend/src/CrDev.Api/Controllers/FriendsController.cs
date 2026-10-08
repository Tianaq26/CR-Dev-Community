using CrDev.Api.Contracts;
using CrDev.Api.Data;
using CrDev.Api.Domain;
using CrDev.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Controllers;

[Route("api/friends")]
public sealed class FriendsController(AppDbContext db, RelationshipService relations) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserCard>>> List()
    {
        var me = UserId;
        var friendIds = await relations.FriendIds(me);
        var users = await db.Users.AsNoTracking().Include(u => u.Skills)
            .Where(u => friendIds.Contains(u.Id))
            .OrderBy(u => u.Name).Take(300)
            .AsSplitQuery().ToListAsync();

        var myKeys = await relations.SkillKeys(me);
        var rels = await relations.For(me, users.Select(u => u.Id));
        return users.Select(u => Mapper.Card(u, rels[u.Id], myKeys)).ToList();
    }

    [HttpGet("requests")]
    public async Task<ActionResult<FriendRequestsView>> Requests()
    {
        var me = UserId;
        var rows = await db.Friendships.AsNoTracking()
            .Include(f => f.Requester).Include(f => f.Addressee)
            .Where(f => f.Status == FriendshipStatus.Pending && (f.RequesterId == me || f.AddresseeId == me))
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return new FriendRequestsView(
            rows.Where(f => f.AddresseeId == me).Select(f => new FriendRequestView(f.Id, Mapper.Brief(f.Requester), f.CreatedAt)).ToList(),
            rows.Where(f => f.RequesterId == me).Select(f => new FriendRequestView(f.Id, Mapper.Brief(f.Addressee), f.CreatedAt)).ToList());
    }

    [HttpPost("requests")]
    public async Task<ActionResult<Relationship>> Send(FriendRequestCreate req)
    {
        var me = UserId;
        if (req.UserId == me) return Fail(StatusCodes.Status400BadRequest, "No puedes agregarte a ti mismo.");
        if (!await db.Users.AnyAsync(u => u.Id == req.UserId))
            return Fail(StatusCodes.Status404NotFound, "No encontramos a esa persona.");

        var existing = await db.Friendships.FirstOrDefaultAsync(f =>
            (f.RequesterId == me && f.AddresseeId == req.UserId) || (f.RequesterId == req.UserId && f.AddresseeId == me));

        if (existing is null)
        {
            var created = new Friendship { RequesterId = me, AddresseeId = req.UserId };
            db.Friendships.Add(created);
            await db.SaveChangesAsync();
            return new Relationship("requestSent", created.Id);
        }

        if (existing.Status == FriendshipStatus.Accepted)
            return Fail(StatusCodes.Status409Conflict, "Ya son amigos.");

        if (existing.RequesterId == me)
            return Fail(StatusCodes.Status409Conflict, "Ya enviaste una solicitud a esta persona.");

        // They had already asked us: sending a request back simply accepts theirs.
        existing.Status = FriendshipStatus.Accepted;
        await db.SaveChangesAsync();
        return new Relationship("friends", existing.Id);
    }

    [HttpPost("requests/{id:guid}/accept")]
    public async Task<ActionResult<Relationship>> Accept(Guid id)
    {
        var request = await db.Friendships.FirstOrDefaultAsync(f => f.Id == id && f.AddresseeId == UserId);
        if (request is null) return Fail(StatusCodes.Status404NotFound, "No encontramos esa solicitud.");
        request.Status = FriendshipStatus.Accepted;
        await db.SaveChangesAsync();
        return new Relationship("friends", request.Id);
    }

    [HttpPost("requests/{id:guid}/decline")]
    public async Task<IActionResult> Decline(Guid id)
    {
        var request = await db.Friendships.FirstOrDefaultAsync(f =>
            f.Id == id && f.AddresseeId == UserId && f.Status == FriendshipStatus.Pending);
        if (request is null) return Fail(StatusCodes.Status404NotFound, "No encontramos esa solicitud.");
        db.Friendships.Remove(request);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Removes a friend, or cancels a request I sent.</summary>
    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> Remove(Guid userId)
    {
        var me = UserId;
        var row = await db.Friendships.FirstOrDefaultAsync(f =>
            (f.RequesterId == me && f.AddresseeId == userId) || (f.RequesterId == userId && f.AddresseeId == me));
        if (row is null) return NoContent();
        db.Friendships.Remove(row);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>People you may know: shared skills first, then newest members.</summary>
    [HttpGet("suggestions")]
    public async Task<ActionResult<IReadOnlyList<UserCard>>> Suggestions()
    {
        var me = UserId;
        var myKeys = await relations.SkillKeys(me);
        var keyArray = myKeys.ToArray();

        var connected = await db.Friendships.AsNoTracking()
            .Where(f => f.RequesterId == me || f.AddresseeId == me)
            .Select(f => f.RequesterId == me ? f.AddresseeId : f.RequesterId)
            .ToListAsync();
        connected.Add(me);

        var users = await db.Users.AsNoTracking().Include(u => u.Skills)
            .Where(u => !connected.Contains(u.Id))
            .OrderByDescending(u => u.Skills.Count(s => keyArray.Contains(s.Key)))
            .ThenByDescending(u => u.CreatedAt)
            .Take(8)
            .AsSplitQuery().ToListAsync();

        return users.Select(u => Mapper.Card(u, Mapper.None, myKeys)).ToList();
    }
}
