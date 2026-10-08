using CrDev.Api.Contracts;
using CrDev.Api.Data;
using CrDev.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Controllers;

[Route("api/media")]
public sealed class MediaController(AppDbContext db) : ApiControllerBase
{
    private const long MaxFileBytes = 4 * 1024 * 1024;
    private const long MaxBytesPerUser = 60L * 1024 * 1024;

    [HttpPost, RequestSizeLimit(MaxFileBytes + 64 * 1024)]
    public async Task<ActionResult<MediaUploadResponse>> Upload(IFormFile file)
    {
        var me = UserId;
        if (file.Length == 0) return Invalid(nameof(file), "El archivo está vacío.");
        if (file.Length > MaxFileBytes) return Fail(StatusCodes.Status413PayloadTooLarge, "La imagen pesa más de 4 MB.");

        var used = await db.MediaFiles.Where(m => m.OwnerId == me).SumAsync(m => (long?)m.Length) ?? 0;
        if (used + file.Length > MaxBytesPerUser)
            return Fail(StatusCodes.Status413PayloadTooLarge, "Alcanzaste el límite de imágenes de tu cuenta.");

        using var buffer = new MemoryStream((int)file.Length);
        await file.CopyToAsync(buffer);
        var data = buffer.ToArray();

        // Trust the bytes, not the filename or the client's Content-Type.
        var contentType = Sniff(data);
        if (contentType is null)
            return Invalid(nameof(file), "Solo se aceptan imágenes JPG, PNG, WebP o GIF.");

        var media = new MediaFile { OwnerId = me, ContentType = contentType, Length = data.Length, Data = data };
        db.MediaFiles.Add(media);
        await db.SaveChangesAsync();
        return new MediaUploadResponse(media.Id, $"/api/media/{media.Id}");
    }

    // <img> tags can't send an Authorization header, and the ids are unguessable.
    [HttpGet("{id:guid}"), AllowAnonymous]
    public async Task<IActionResult> Get(Guid id)
    {
        var media = await db.MediaFiles.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id);
        if (media is null) return NotFound();

        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers.ContentSecurityPolicy = "default-src 'none'; sandbox";
        return File(media.Data, media.ContentType);
    }

    public static string? Sniff(ReadOnlySpan<byte> d)
    {
        if (d.Length >= 3 && d[0] == 0xFF && d[1] == 0xD8 && d[2] == 0xFF) return "image/jpeg";
        if (d.Length >= 8 && d[0] == 0x89 && d[1] == 0x50 && d[2] == 0x4E && d[3] == 0x47
            && d[4] == 0x0D && d[5] == 0x0A && d[6] == 0x1A && d[7] == 0x0A) return "image/png";
        if (d.Length >= 6 && d[0] == 'G' && d[1] == 'I' && d[2] == 'F' && d[3] == '8'
            && (d[4] == '7' || d[4] == '9') && d[5] == 'a') return "image/gif";
        if (d.Length >= 12 && d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F'
            && d[8] == 'W' && d[9] == 'E' && d[10] == 'B' && d[11] == 'P') return "image/webp";
        return null;
    }
}
