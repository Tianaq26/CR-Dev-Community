using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace CrDev.Api.Tests;

public sealed class AuthAndProfileTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Register_returns_token_and_profile_and_blocks_duplicate_email()
    {
        var http = factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";

        var first = await http.PostJsonAsync("/api/auth/register", new { name = "Ana Prueba", email, password = "password123" });
        var body = await first.ReadAsync<JsonElement>();
        Assert.False(string.IsNullOrEmpty(body.GetProperty("token").GetString()));
        Assert.Equal("Ana Prueba", body.GetProperty("user").GetProperty("name").GetString());

        var dup = await http.PostJsonAsync("/api/auth/register", new { name = "Otra Ana", email = email.ToUpperInvariant(), password = "password123" });
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);
    }

    [Theory]
    [InlineData("A", "ok@example.com", "password123")]
    [InlineData("Ana", "not-an-email", "password123")]
    [InlineData("Ana", "ok2@example.com", "short")]
    public async Task Register_rejects_invalid_input(string name, string email, string password)
    {
        var resp = await factory.CreateClient().PostJsonAsync("/api/auth/register", new { name, email, password });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Login_works_with_right_password_and_fails_with_wrong_one()
    {
        var user = await TestUser.Register(factory, "Login Persona");
        var http = factory.CreateClient();

        var ok = await http.PostJsonAsync("/api/auth/login", new { email = user.Email.ToUpperInvariant(), password = "password123" });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        var bad = await http.PostJsonAsync("/api/auth/login", new { email = user.Email, password = "wrong-password" });
        Assert.Equal(HttpStatusCode.Unauthorized, bad.StatusCode);

        var unknown = await http.PostJsonAsync("/api/auth/login", new { email = "nadie@example.com", password = "password123" });
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
    }

    [Theory]
    [InlineData("/api/me")]
    [InlineData("/api/projects")]
    [InlineData("/api/ideas")]
    [InlineData("/api/friends")]
    [InlineData("/api/inbox")]
    public async Task Protected_endpoints_require_a_token(string url)
    {
        var resp = await factory.CreateClient().GetAsync(url);
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Profile_update_stores_work_study_and_normalizes_skills()
    {
        var me = await TestUser.Register(factory, "Perfil Persona");

        var resp = await me.Http.PutJsonAsync("/api/me", new
        {
            name = "  Perfil   Persona ",
            headline = "Músico y dev",
            location = "San José",
            bio = "Hola.",
            workCompany = "Taller Pino",
            workRole = "Compositor",
            studyInstitution = "Universidad Nacional",
            studyProgram = "Sonido",
            githubUrl = "https://github.com/alguien",
            skills = new[] { "Músico", "músico", "  Diseño   de sonido ", "", "Frontend" },
        });
        var profile = await resp.ReadAsync<JsonElement>();

        Assert.Equal("Perfil Persona", profile.GetProperty("name").GetString());
        Assert.Equal("Taller Pino", profile.GetProperty("work").GetProperty("company").GetString());
        Assert.Equal("Sonido", profile.GetProperty("study").GetProperty("program").GetString());
        var skills = profile.GetProperty("skills").EnumerateArray().Select(s => s.GetString()).ToList();
        Assert.Equal(["Diseño de sonido", "Frontend", "Músico"], skills);
    }

    [Fact]
    public async Task Profile_can_have_only_work_or_only_study()
    {
        var me = await TestUser.Register(factory, "Solo Estudio");
        var profile = await (await me.Http.PutJsonAsync("/api/me", new { name = "Solo Estudio", studyInstitution = "UCR" })).ReadAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("work").ValueKind);
        Assert.Equal("UCR", profile.GetProperty("study").GetProperty("institution").GetString());
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("ftp://example.com/x")]
    [InlineData("no es una url")]
    public async Task Profile_rejects_unsafe_links(string link)
    {
        var me = await TestUser.Register(factory, "Links Persona");
        var resp = await me.Http.PutJsonAsync("/api/me", new { name = "Links Persona", websiteUrl = link });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Other_people_see_a_profile_without_the_email()
    {
        var a = await TestUser.Register(factory, "Persona A");
        var b = await TestUser.Register(factory, "Persona B");

        var own = await a.Http.GetJsonAsync<JsonElement>($"/api/users/{a.Id}");
        var seenByB = await b.Http.GetJsonAsync<JsonElement>($"/api/users/{a.Id}");

        Assert.Equal(a.Email, own.GetProperty("email").GetString());
        Assert.Equal(JsonValueKind.Null, seenByB.GetProperty("email").ValueKind);
    }

    [Fact]
    public async Task People_search_finds_by_skill_and_excludes_self()
    {
        var me = await TestUser.Register(factory, "Busca Persona");
        var luthier = await TestUser.Register(factory, "Lutier Único", "Luthería");

        var found = await me.Http.GetJsonAsync<JsonElement>("/api/users?skill=LUTHERIA");
        var ids = found.GetProperty("items").EnumerateArray().Select(u => u.GetProperty("id").GetGuid()).ToList();
        Assert.Contains(luthier.Id, ids);
        Assert.DoesNotContain(me.Id, ids);
    }
}

public sealed class ValidationMessageTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Validation_errors_come_back_in_spanish_keyed_by_camel_case_field()
    {
        var resp = await factory.CreateClient().PostJsonAsync("/api/auth/register", new { name = "A", email = "nope", password = "123" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);

        var problem = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Revisa los datos del formulario.", problem.GetProperty("title").GetString());
        var errors = problem.GetProperty("errors");
        Assert.Contains("mínimo 2", errors.GetProperty("name")[0].GetString());
        Assert.Equal("Escribe un correo válido.", errors.GetProperty("email")[0].GetString());
        Assert.Contains("mínimo 8", errors.GetProperty("password")[0].GetString());
    }

    [Fact]
    public async Task Custom_validation_errors_use_the_same_shape()
    {
        var me = await TestUser.Register(factory, "Forma Uniforme");
        var resp = await me.Http.PutJsonAsync("/api/me", new { name = "Forma Uniforme", websiteUrl = "javascript:alert(1)" });
        var problem = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("http", problem.GetProperty("errors").GetProperty("websiteUrl")[0].GetString());
    }
}
