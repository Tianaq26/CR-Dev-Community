using CrDev.Api.Contracts;
using CrDev.Api.Data;
using CrDev.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Controllers;

public sealed record SkillGroup(string Name, IReadOnlyList<string> Skills);
public sealed record SkillCatalogView(IReadOnlyList<SkillGroup> Groups, IReadOnlyList<string> Community);

[Route("api")]
public sealed class MetaController(AppDbContext db) : ApiControllerBase
{
    private static readonly SkillGroup[] Catalog =
    [
        new("Tecnología", ["Frontend", "Backend", "Full Stack", "Móvil", "Videojuegos", "Datos", "Inteligencia artificial", "DevOps", "Ciberseguridad", "QA / Pruebas", "Hardware / IoT"]),
        new("Diseño y arte", ["Diseño UI/UX", "Diseño gráfico", "Ilustración", "Animación", "Modelado 3D", "Fotografía", "Edición de video"]),
        new("Música y audio", ["Músico", "Composición", "Producción musical", "Diseño de sonido", "Locución"]),
        new("Contenido y negocio", ["Redacción", "Guion", "Traducción", "Marketing", "Gestión de proyectos", "Comunidad", "Finanzas", "Legal"]),
    ];

    private static readonly HashSet<string> CatalogKeys =
        Catalog.SelectMany(g => g.Skills).Select(SkillKey.Of).ToHashSet();

    /// <summary>Suggested skills for pickers: a curated catalog plus what the community already uses.</summary>
    [HttpGet("skills")]
    public async Task<ActionResult<SkillCatalogView>> Skills()
    {
        var used = await db.UserSkills.AsNoTracking()
            .GroupBy(s => s.Key)
            .Select(g => new { Key = g.Key, Name = g.Min(x => x.Name), Count = g.Count() })
            .OrderByDescending(x => x.Count).Take(60)
            .ToListAsync();

        var community = used.Where(u => !CatalogKeys.Contains(u.Key)).Take(20).Select(u => u.Name!).OrderBy(n => n).ToList();
        return new SkillCatalogView(Catalog, community);
    }

    [HttpGet("stats"), AllowAnonymous]
    public async Task<ActionResult<StatsView>> Stats() =>
        new StatsView(await db.Users.CountAsync(), await db.Projects.CountAsync(), await db.Ideas.CountAsync());
}
