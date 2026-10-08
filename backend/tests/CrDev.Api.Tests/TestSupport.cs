using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CrDev.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace CrDev.Api.Tests;

/// <summary>
/// Spins the real app up against a throwaway database: a SQLite file by default, or a fresh PostgreSQL
/// database when TEST_POSTGRES is set (e.g. "Host=localhost;Username=postgres;Password=postgres").
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private static readonly string? PostgresAdmin = Environment.GetEnvironmentVariable("TEST_POSTGRES");

    private readonly string _id = Guid.NewGuid().ToString("N");
    private string DbPath => Path.Combine(Path.GetTempPath(), $"crdev-test-{_id}.db");
    private string PgDatabase => $"crdev_test_{_id}";

    static ApiFactory()
    {
        // Read by Program.cs before the test host can override configuration.
        Environment.SetEnvironmentVariable("JWT_SECRET", "test-secret-test-secret-test-secret-123456");
        Environment.SetEnvironmentVariable("RateLimit__AuthPerMinute", "100000");
        Environment.SetEnvironmentVariable("SEED_DEMO", "false");
    }

    public ApiFactory()
    {
        if (PostgresAdmin is not null) RunAdmin($"CREATE DATABASE \"{PgDatabase}\"");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            if (PostgresAdmin is not null)
                services.AddDbContext<AppDbContext>(o => o.UseNpgsql($"{PostgresAdmin};Database={PgDatabase}"));
            else
                services.AddDbContext<AppDbContext>(o => o.UseSqlite($"Data Source={DbPath}"));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (PostgresAdmin is not null)
        {
            Npgsql.NpgsqlConnection.ClearAllPools();
            RunAdmin($"DROP DATABASE IF EXISTS \"{PgDatabase}\" WITH (FORCE)");
        }
        foreach (var path in new[] { DbPath, DbPath + "-wal", DbPath + "-shm" })
            if (File.Exists(path)) File.Delete(path);
    }

    private static void RunAdmin(string sql)
    {
        using var connection = new Npgsql.NpgsqlConnection($"{PostgresAdmin};Database=postgres");
        connection.Open();
        using var command = new Npgsql.NpgsqlCommand(sql, connection);
        command.ExecuteNonQuery();
    }
}

public static class Json
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Expected success but got {(int)response.StatusCode}: {body}");
        return JsonSerializer.Deserialize<T>(body, Options)!;
    }

    public static Task<HttpResponseMessage> PostJsonAsync(this HttpClient c, string url, object? body) =>
        c.PostAsJsonAsync(url, body, Options);

    public static Task<HttpResponseMessage> PutJsonAsync(this HttpClient c, string url, object? body) =>
        c.PutAsJsonAsync(url, body, Options);

    public static async Task<T> GetJsonAsync<T>(this HttpClient c, string url) =>
        await (await c.GetAsync(url)).ReadAsync<T>();
}

/// <summary>A registered user with an authenticated client.</summary>
public sealed class TestUser
{
    public required HttpClient Http { get; init; }
    public required Guid Id { get; init; }
    public required string Email { get; init; }

    public static async Task<TestUser> Register(ApiFactory factory, string name, params string[] skills)
    {
        var http = factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";
        var auth = await (await http.PostJsonAsync("/api/auth/register", new { name, email, password = "password123" }))
            .ReadAsync<JsonElement>();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.GetProperty("token").GetString());
        var id = auth.GetProperty("user").GetProperty("id").GetGuid();

        var user = new TestUser { Http = http, Id = id, Email = email };
        if (skills.Length > 0)
        {
            var resp = await http.PutJsonAsync("/api/me", new { name, skills });
            await resp.ReadAsync<JsonElement>();
        }
        return user;
    }

    public async Task<JsonElement> CreateProject(string title, params (string skill, bool open)[] roles)
    {
        var resp = await Http.PostJsonAsync("/api/projects", new
        {
            title,
            summary = "Un proyecto de prueba con resumen suficiente.",
            description = "Detalles largos del proyecto.",
            status = "Building",
            roles = roles.Select(r => new { skill = r.skill, isOpen = r.open }),
        });
        return await resp.ReadAsync<JsonElement>();
    }
}
