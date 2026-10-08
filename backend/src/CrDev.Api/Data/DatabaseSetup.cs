using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace CrDev.Api.Data;

/// <summary>
/// Picks the database provider from configuration:
/// no setting          -> local SQLite file (zero setup for development)
/// postgres:// URL     -> PostgreSQL (what Railway, Neon, Supabase and Render hand out)
/// "Host=..." string   -> PostgreSQL
/// anything else       -> treated as a SQLite connection string
/// </summary>
public static class DatabaseSetup
{
    public static void Configure(DbContextOptionsBuilder options, IConfiguration config)
    {
        var raw = config["DATABASE_URL"];
        if (string.IsNullOrWhiteSpace(raw)) raw = config.GetConnectionString("Default");

        if (string.IsNullOrWhiteSpace(raw))
        {
            options.UseSqlite("Data Source=crdev.db");
        }
        else if (raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
                 raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            options.UseNpgsql(FromUrl(raw));
        }
        else if (raw.Contains("Host=", StringComparison.OrdinalIgnoreCase) ||
                 raw.Contains("Server=", StringComparison.OrdinalIgnoreCase))
        {
            options.UseNpgsql(raw);
        }
        else
        {
            options.UseSqlite(raw);
        }
    }

    public static string FromUrl(string url)
    {
        var uri = new Uri(url);
        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : null,
            // Free tiers sleep: give the database time to wake up before failing.
            Timeout = 30,
            CommandTimeout = 30,
        };

        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        // Same meaning as libpq: "require" encrypts without verifying the certificate,
        // which is what managed providers (Railway proxy, Neon, Supabase) expect.
        // Npgsql's SslMode.Require/Prefer behave the same way.
        switch (query["sslmode"]?.ToLowerInvariant())
        {
            case "disable":
                builder.SslMode = SslMode.Disable;
                break;
            case "verify-ca":
            case "verify-full":
                builder.SslMode = SslMode.VerifyFull;
                break;
            case "require":
                builder.SslMode = SslMode.Require;
                break;
            default:
                builder.SslMode = SslMode.Prefer;
                break;
        }

        return builder.ConnectionString;
    }
}
