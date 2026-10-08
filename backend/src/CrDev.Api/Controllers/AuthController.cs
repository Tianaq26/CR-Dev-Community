using CrDev.Api.Contracts;
using CrDev.Api.Data;
using CrDev.Api.Domain;
using CrDev.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Controllers;

[Route("api/auth"), AllowAnonymous, EnableRateLimiting("auth")]
public sealed class AuthController(AppDbContext db, TokenService tokens) : ApiControllerBase
{
    // Verified against when the email is unknown, so response time doesn't reveal which emails exist.
    private static readonly string DummyHash = BCrypt.Net.BCrypt.EnhancedHashPassword("not-a-real-password", 11);

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var name = SkillKey.CollapseSpaces(req.Name);
        if (name.Length < 2) return Invalid(nameof(req.Name), "Escribe tu nombre.");

        if (await db.Users.AnyAsync(u => u.Email == email))
            return Fail(StatusCodes.Status409Conflict, "Ya existe una cuenta con ese correo.");

        var user = new User
        {
            Email = email,
            Name = name,
            PasswordHash = BCrypt.Net.BCrypt.EnhancedHashPassword(req.Password, 11),
        };
        db.Users.Add(user);
        var raceLost = false;
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            raceLost = true;
        }

        // A concurrent registration with the same email can slip past the check above; the unique index catches it.
        if (raceLost)
        {
            db.ChangeTracker.Clear();
            if (await db.Users.AnyAsync(u => u.Email == email))
                return Fail(StatusCodes.Status409Conflict, "Ya existe una cuenta con ese correo.");
            throw new InvalidOperationException("Could not create the account.");
        }

        return Ok(new AuthResponse(tokens.Create(user),
            Mapper.Profile(user, Mapper.Self, 0, 0, 0, includeEmail: true)));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.Include(u => u.Skills).FirstOrDefaultAsync(u => u.Email == email);

        var valid = BCrypt.Net.BCrypt.EnhancedVerify(req.Password, user?.PasswordHash ?? DummyHash);
        if (user is null || !valid)
            return Fail(StatusCodes.Status401Unauthorized, "Correo o contraseña incorrectos.");

        return Ok(new AuthResponse(tokens.Create(user), await ProfileBuilder.ForSelf(db, user)));
    }
}
