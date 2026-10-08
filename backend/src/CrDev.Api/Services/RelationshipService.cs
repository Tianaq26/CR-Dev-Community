using CrDev.Api.Contracts;
using CrDev.Api.Data;
using CrDev.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Services;

public sealed class RelationshipService(AppDbContext db)
{
    /// <summary>How <paramref name="me"/> relates to each of the given users.</summary>
    public async Task<Dictionary<Guid, Relationship>> For(Guid me, IEnumerable<Guid> others, CancellationToken ct = default)
    {
        var ids = others.Distinct().ToList();
        var result = ids.ToDictionary(id => id, id => id == me ? Mapper.Self : Mapper.None);
        if (ids.Count == 0) return result;

        var rows = await db.Friendships.AsNoTracking()
            .Where(f => (f.RequesterId == me && ids.Contains(f.AddresseeId))
                     || (f.AddresseeId == me && ids.Contains(f.RequesterId)))
            .ToListAsync(ct);

        foreach (var f in rows)
        {
            var other = f.RequesterId == me ? f.AddresseeId : f.RequesterId;
            result[other] = f.Status == FriendshipStatus.Accepted
                ? new Relationship("friends", f.Id)
                : f.RequesterId == me
                    ? new Relationship("requestSent", f.Id)
                    : new Relationship("requestReceived", f.Id);
        }
        return result;
    }

    public async Task<Relationship> With(Guid me, Guid other, CancellationToken ct = default) =>
        (await For(me, [other], ct))[other];

    public Task<List<Guid>> FriendIds(Guid me, CancellationToken ct = default) =>
        db.Friendships.AsNoTracking()
            .Where(f => f.Status == FriendshipStatus.Accepted && (f.RequesterId == me || f.AddresseeId == me))
            .Select(f => f.RequesterId == me ? f.AddresseeId : f.RequesterId)
            .ToListAsync(ct);

    public async Task<HashSet<string>> SkillKeys(Guid userId, CancellationToken ct = default) =>
        (await db.UserSkills.AsNoTracking().Where(s => s.UserId == userId).Select(s => s.Key).ToListAsync(ct)).ToHashSet();
}
