using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using CrDev.Api.Data;
using CrDev.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// PaaS hosts (Railway, Render, Fly) tell us which port to listen on.
if (Environment.GetEnvironmentVariable("PORT") is { Length: > 0 } port)
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ---- Configuration -------------------------------------------------------------------------
var config = builder.Configuration;
var jwtSecret = config["JWT_SECRET"] ?? config["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    if (!builder.Environment.IsDevelopment())
        throw new InvalidOperationException("JWT_SECRET is required (min 32 characters). Generate one with: openssl rand -base64 48");
    jwtSecret = "dev-only-secret-change-me-dev-only-secret-change-me";
}
if (jwtSecret.Length < 32)
    throw new InvalidOperationException("JWT_SECRET must be at least 32 characters.");

// Without a real database the app would silently fall back to a SQLite file on the host's ephemeral
// disk, and every redeploy would wipe the community. Better to refuse to start.
if (builder.Environment.IsProduction() && string.IsNullOrWhiteSpace(config["DATABASE_URL"]) && string.IsNullOrWhiteSpace(config.GetConnectionString("Default")))
    throw new InvalidOperationException("DATABASE_URL is required in production (a postgresql://… URL from Neon, Railway, Render or Supabase).");

var jwt = new JwtSettings { Secret = jwtSecret };
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton<TokenService>();

// ---- Data ----------------------------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>((sp, o) => DatabaseSetup.Configure(o, sp.GetRequiredService<IConfiguration>()));
builder.Services.AddScoped<RelationshipService>();

// ---- Auth ----------------------------------------------------------------------------------
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = JwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = JwtSettings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwt.Key,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });
builder.Services.AddAuthorization();

// ---- Web -----------------------------------------------------------------------------------
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
    .ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = ctx =>
        new BadRequestObjectResult(ValidationProblems.From(ctx.ModelState)) { ContentTypes = { "application/problem+json" } });
builder.Services.AddProblemDetails();

builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // We run behind the platform's load balancer, whose address we cannot know in advance.
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

var allowedOrigins = (config["CORS_ORIGINS"] ?? "http://localhost:5173,http://127.0.0.1:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(allowedOrigins)
    .SetIsOriginAllowedToAllowWildcardSubdomains() // allows entries like https://*.vercel.app
    .AllowAnyHeader()
    .AllowAnyMethod()));

var authPerMinute = config.GetValue("RateLimit:AuthPerMinute", 10);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = authPerMinute, Window = TimeSpan.FromMinutes(1) }));
});

if (builder.Environment.IsDevelopment()) builder.Services.AddOpenApi();

// ---- Pipeline ------------------------------------------------------------------------------
var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.MapGet("/", () => Results.Ok(new { name = "CR Dev Community API", status = "ok" }));
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

await DbInitializer.RunAsync(app.Services, app.Logger);

app.Run();

public partial class Program;
