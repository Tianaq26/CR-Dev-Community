using CrDev.Api.Contracts;
using CrDev.Api.Data;
using CrDev.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Services;

public static class ProfileBuilder
{
    public static async Task<UserProfile> Build(AppDbContext db, User user, Relationship relationship, bool includeEmail, CancellationToken ct = default)
    {
        var id = user.Id;
        var friends = await db.Friendships.CountAsync(f =>
            f.Status == FriendshipStatus.Accepted && (f.RequesterId == id || f.AddresseeId == id), ct);
        var projects = await db.Projects.CountAsync(p => p.OwnerId == id, ct);
        var ideas = await db.Ideas.CountAsync(i => i.AuthorId == id, ct);
        return Mapper.Profile(user, relationship, friends, projects, ideas, includeEmail);
    }

    public static Task<UserProfile> ForSelf(AppDbContext db, User user, CancellationToken ct = default) =>
        Build(db, user, Mapper.Self, includeEmail: true, ct);
}
