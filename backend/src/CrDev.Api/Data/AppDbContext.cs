using CrDev.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CrDev.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserSkill> UserSkills => Set<UserSkill>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMedia> ProjectMedia => Set<ProjectMedia>();
    public DbSet<ProjectRole> ProjectRoles => Set<ProjectRole>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<JoinRequest> JoinRequests => Set<JoinRequest>();
    public DbSet<Friendship> Friendships => Set<Friendship>();
    public DbSet<Idea> Ideas => Set<Idea>();
    public DbSet<IdeaTag> IdeaTags => Set<IdeaTag>();
    public DbSet<IdeaInterest> IdeaInterests => Set<IdeaInterest>();
    public DbSet<IdeaComment> IdeaComments => Set<IdeaComment>();
    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // SQLite hands back DateTimes with Kind=Unspecified, which would serialize without a "Z"
        // and be misread by browsers as local time. Everything we store is UTC.
        builder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        builder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.Name).HasMaxLength(80);
            e.HasMany(x => x.Skills).WithOne().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<UserSkill>(e =>
        {
            e.HasKey(x => new { x.UserId, x.Key });
            e.HasIndex(x => x.Key);
            e.Property(x => x.Key).HasMaxLength(60);
            e.Property(x => x.Name).HasMaxLength(60);
        });

        b.Entity<Project>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Media).WithOne().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Roles).WithOne().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Members).WithOne().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.JoinRequests).WithOne(x => x.Project).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<ProjectMedia>(e =>
        {
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.Url).HasMaxLength(600);
        });

        b.Entity<ProjectRole>(e =>
        {
            e.HasIndex(x => x.SkillKey);
            e.Property(x => x.SkillKey).HasMaxLength(60);
        });

        b.Entity<ProjectMember>(e =>
        {
            e.HasKey(x => new { x.ProjectId, x.UserId });
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<JoinRequest>(e =>
        {
            e.HasIndex(x => new { x.ProjectId, x.ApplicantId });
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(10);
            e.HasOne(x => x.Role).WithMany().HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Applicant).WithMany().HasForeignKey(x => x.ApplicantId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Friendship>(e =>
        {
            e.HasIndex(x => new { x.RequesterId, x.AddresseeId }).IsUnique();
            e.HasIndex(x => x.AddresseeId);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(10);
            e.HasOne(x => x.Requester).WithMany().HasForeignKey(x => x.RequesterId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Addressee).WithMany().HasForeignKey(x => x.AddresseeId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Idea>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
            e.HasOne(x => x.Author).WithMany().HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Tags).WithOne().HasForeignKey(x => x.IdeaId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Interests).WithOne().HasForeignKey(x => x.IdeaId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Comments).WithOne().HasForeignKey(x => x.IdeaId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<IdeaTag>(e =>
        {
            e.HasKey(x => new { x.IdeaId, x.Key });
            e.HasIndex(x => x.Key);
            e.Property(x => x.Key).HasMaxLength(60);
            e.Property(x => x.Name).HasMaxLength(60);
        });

        b.Entity<IdeaInterest>(e => e.HasKey(x => new { x.IdeaId, x.UserId }));

        b.Entity<IdeaComment>(e =>
        {
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(10);
            e.HasOne(x => x.Author).WithMany().HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<MediaFile>(e =>
        {
            e.HasIndex(x => x.OwnerId);
            e.Property(x => x.ContentType).HasMaxLength(40);
        });

        // Ids are always assigned in code. Without this EF assumes a new child that already has a Guid
        // (added to a tracked parent) exists in the database and issues an UPDATE instead of an INSERT.
        foreach (var entity in b.Model.GetEntityTypes())
            foreach (var key in entity.FindPrimaryKey()?.Properties.Where(p => p.ClrType == typeof(Guid)) ?? [])
                key.ValueGenerated = Microsoft.EntityFrameworkCore.Metadata.ValueGenerated.Never;
    }
}

public sealed class UtcDateTimeConverter()
    : ValueConverter<DateTime, DateTime>(v => v.ToUniversalTime(), v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

public sealed class NullableUtcDateTimeConverter()
    : ValueConverter<DateTime?, DateTime?>(
        v => v.HasValue ? v.Value.ToUniversalTime() : v,
        v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);
