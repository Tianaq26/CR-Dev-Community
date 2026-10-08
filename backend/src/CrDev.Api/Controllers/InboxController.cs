using CrDev.Api.Contracts;
using CrDev.Api.Data;
using CrDev.Api.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Controllers;

[Route("api")]
public sealed class InboxController(AppDbContext db) : ApiControllerBase
{
    [HttpGet("inbox")]
    public async Task<ActionResult<InboxView>> Get()
    {
        var me = UserId;

        var friendRequests = await db.Friendships.AsNoTracking()
            .Where(f => f.AddresseeId == me && f.Status == FriendshipStatus.Pending)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new FriendRequestView(f.Id,
                new UserBrief(f.Requester.Id, f.Requester.Name, f.Requester.Headline, f.Requester.AvatarUrl), f.CreatedAt))
            .ToListAsync();

        var received = await ReceivedFor(db, q => q.Where(r => r.Project.OwnerId == me));

        var sent = await db.JoinRequests.AsNoTracking()
            .Where(r => r.ApplicantId == me)
            .OrderByDescending(r => r.CreatedAt).Take(30)
            .Select(r => new JoinRequestSent(r.Id, r.ProjectId, r.Project.Title,
                r.Role != null ? r.Role.Title : null, r.Status, r.CreatedAt, r.RespondedAt))
            .ToListAsync();

        return new InboxView(friendRequests, received, sent, friendRequests.Count + received.Count);
    }

    [HttpGet("inbox/count")]
    public async Task<ActionResult<object>> Count()
    {
        var me = UserId;
        var friends = await db.Friendships.CountAsync(f => f.AddresseeId == me && f.Status == FriendshipStatus.Pending);
        var joins = await db.JoinRequests.CountAsync(r => r.Project.OwnerId == me && r.Status == JoinRequestStatus.Pending);
        return new { pending = friends + joins };
    }

    [HttpPost("join-requests/{id:guid}/accept")]
    public async Task<IActionResult> Accept(Guid id)
    {
        var (request, error) = await LoadOwned(id);
        if (error is not null) return error;

        request!.Status = JoinRequestStatus.Accepted;
        request.RespondedAt = DateTime.UtcNow;

        var alreadyMember = await db.ProjectMembers.AnyAsync(m => m.ProjectId == request.ProjectId && m.UserId == request.ApplicantId);
        if (!alreadyMember)
        {
            db.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = request.ProjectId,
                UserId = request.ApplicantId,
                RoleTitle = request.Role?.Title ?? "Colaborador",
            });
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("join-requests/{id:guid}/decline")]
    public async Task<IActionResult> Decline(Guid id)
    {
        var (request, error) = await LoadOwned(id);
        if (error is not null) return error;

        request!.Status = JoinRequestStatus.Declined;
        request.RespondedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>The applicant withdraws a request that hasn't been answered yet.</summary>
    [HttpDelete("join-requests/{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var request = await db.JoinRequests.FirstOrDefaultAsync(r =>
            r.Id == id && r.ApplicantId == UserId && r.Status == JoinRequestStatus.Pending);
        if (request is null) return NoContent();
        db.JoinRequests.Remove(request);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<(JoinRequest? Request, ActionResult? Error)> LoadOwned(Guid id)
    {
        var request = await db.JoinRequests.Include(r => r.Project).Include(r => r.Role).FirstOrDefaultAsync(r => r.Id == id);
        if (request is null) return (null, Fail(StatusCodes.Status404NotFound, "No encontramos esa solicitud."));
        if (request.Project.OwnerId != UserId) return (null, Fail(StatusCodes.Status403Forbidden, "Solo quien creó el proyecto puede responder."));
        if (request.Status != JoinRequestStatus.Pending) return (null, Fail(StatusCodes.Status409Conflict, "Esta solicitud ya fue respondida."));
        return (request, null);
    }

    /// <summary>Pending requests received by project owners, narrowed by <paramref name="filter"/>.</summary>
    public static async Task<List<JoinRequestReceived>> ReceivedFor(
        AppDbContext db, Func<IQueryable<JoinRequest>, IQueryable<JoinRequest>> filter)
    {
        var rows = await filter(db.JoinRequests.AsNoTracking().Where(r => r.Status == JoinRequestStatus.Pending))
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id, r.ProjectId, ProjectTitle = r.Project.Title,
                RoleTitle = r.Role != null ? r.Role.Title : null,
                ApplicantId = r.Applicant.Id, r.Applicant.Name, r.Applicant.Headline, r.Applicant.AvatarUrl,
                Skills = r.Applicant.Skills.Select(s => s.Name).OrderBy(n => n).ToList(),
                r.Message, r.CreatedAt,
            })
            .ToListAsync();

        return rows.Select(r => new JoinRequestReceived(
            r.Id, r.ProjectId, r.ProjectTitle, r.RoleTitle,
            new UserBrief(r.ApplicantId, r.Name, r.Headline, r.AvatarUrl),
            r.Skills, r.Message, r.CreatedAt)).ToList();
    }
}
