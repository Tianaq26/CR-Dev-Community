using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CrDev.Api.Domain;
using Microsoft.IdentityModel.Tokens;

namespace CrDev.Api.Services;

public sealed class JwtSettings
{
    public const string Issuer = "crdev-community";
    public const string Audience = "crdev-web";

    public string Secret { get; init; } = "";
    public int Days { get; init; } = 14;

    public SymmetricSecurityKey Key => new(Encoding.UTF8.GetBytes(Secret));
}

public sealed class TokenService(JwtSettings settings)
{
    public string Create(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Name, user.Name),
        };
        var token = new JwtSecurityToken(
            JwtSettings.Issuer,
            JwtSettings.Audience,
            claims,
            expires: DateTime.UtcNow.AddDays(settings.Days),
            signingCredentials: new SigningCredentials(settings.Key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
