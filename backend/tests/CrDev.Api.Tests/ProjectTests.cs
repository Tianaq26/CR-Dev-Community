using System.Net;
using System.Text.Json;

namespace CrDev.Api.Tests;

public sealed class ProjectTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static Guid[] Ids(JsonElement page) =>
        page.GetProperty("items").EnumerateArray().Select(p => p.GetProperty("id").GetGuid()).ToArray();

    [Fact]
    public async Task Creating_a_project_stores_roles_media_and_returns_detail()
    {
        var owner = await TestUser.Register(factory, "Dueña Proyecto");

        var resp = await owner.Http.PostJsonAsync("/api/projects", new
        {
            title = "Cuentos del Cafetal",
            summary = "Libro ilustrado interactivo sobre fincas cafetaleras.",
            description = "Detalles largos.",
            status = "Building",
            repoUrl = "https://github.com/x/y",
            media = new[]
            {
                new { kind = "Image", url = "https://example.com/a.jpg" },
                new { kind = "Video", url = "https://www.youtube.com/watch?v=abc" },
            },
            roles = new[] { new { skill = "Músico", title = "Músico ambiental", description = "Piezas largas", isOpen = true } },
        });

        var detail = await resp.ReadAsync<JsonElement>();
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        Assert.True(detail.GetProperty("isOwner").GetBoolean());
        Assert.Equal(2, detail.GetProperty("media").GetArrayLength());
        var role = detail.GetProperty("roles")[0];
        Assert.Equal("Músico ambiental", role.GetProperty("title").GetString());
        Assert.Equal("Músico", role.GetProperty("skill").GetString());
    }

    [Theory]
    [InlineData("Image", "javascript:alert(1)")]
    [InlineData("Image", "data:image/png;base64,AAAA")]
    [InlineData("Video", "/api/media/00000000-0000-0000-0000-000000000000")]
    [InlineData("Video", "not a url")]
    public async Task Media_urls_must_be_safe(string kind, string url)
    {
        var owner = await TestUser.Register(factory, "Media Persona");
        var resp = await owner.Http.PostJsonAsync("/api/projects", new
        {
            title = "Proyecto con media mala",
            summary = "Resumen suficientemente largo.",
            media = new[] { new { kind, url } },
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task ForYou_feed_only_lists_projects_with_open_roles_matching_my_skills()
    {
        var owner = await TestUser.Register(factory, "Dueño");
        var musician = await TestUser.Register(factory, "Música", "Músico");

        var wantsMusician = await owner.CreateProject("Busca músico", ("musico", true));
        var filledMusician = await owner.CreateProject("Músico ya cubierto", ("Músico", false));
        var wantsDev = await owner.CreateProject("Busca backend", ("Backend", true));

        var feed = await musician.Http.GetJsonAsync<JsonElement>("/api/projects?feed=foryou&pageSize=30");
        var ids = Ids(feed);

        Assert.Contains(wantsMusician.GetProperty("id").GetGuid(), ids);
        Assert.DoesNotContain(filledMusician.GetProperty("id").GetGuid(), ids);
        Assert.DoesNotContain(wantsDev.GetProperty("id").GetGuid(), ids);

        var card = feed.GetProperty("items").EnumerateArray().First(p => p.GetProperty("id").GetGuid() == wantsMusician.GetProperty("id").GetGuid());
        Assert.Equal(1, card.GetProperty("matchCount").GetInt32());
        Assert.True(card.GetProperty("roles")[0].GetProperty("isMatch").GetBoolean());
    }

    [Fact]
    public async Task ForYou_never_includes_my_own_projects()
    {
        var me = await TestUser.Register(factory, "Auto Match", "Backend");
        var mine = await me.CreateProject("Mi propio proyecto", ("Backend", true));
        var feed = await me.Http.GetJsonAsync<JsonElement>("/api/projects?feed=foryou");
        Assert.DoesNotContain(mine.GetProperty("id").GetGuid(), Ids(feed));
    }

    [Fact]
    public async Task Only_the_owner_can_edit_or_delete()
    {
        var owner = await TestUser.Register(factory, "Dueña");
        var other = await TestUser.Register(factory, "Intrusa");
        var project = await owner.CreateProject("Protegido", ("Backend", true));
        var id = project.GetProperty("id").GetGuid();

        var edit = await other.Http.PutJsonAsync($"/api/projects/{id}", new { title = "Hackeado", summary = "Resumen suficientemente largo." });
        Assert.Equal(HttpStatusCode.Forbidden, edit.StatusCode);

        var del = await other.Http.DeleteAsync($"/api/projects/{id}");
        Assert.Equal(HttpStatusCode.Forbidden, del.StatusCode);

        var stillThere = await owner.Http.GetAsync($"/api/projects/{id}");
        Assert.Equal(HttpStatusCode.OK, stillThere.StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await owner.Http.DeleteAsync($"/api/projects/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.Http.GetAsync($"/api/projects/{id}")).StatusCode);
    }

    [Fact]
    public async Task Updating_keeps_role_identity_and_replaces_the_rest()
    {
        var owner = await TestUser.Register(factory, "Editora");
        var project = await owner.CreateProject("Original", ("Backend", true), ("Frontend", true));
        var id = project.GetProperty("id").GetGuid();
        var backendId = project.GetProperty("roles").EnumerateArray().First(r => r.GetProperty("skill").GetString() == "Backend").GetProperty("id").GetGuid();

        var resp = await owner.Http.PutJsonAsync($"/api/projects/{id}", new
        {
            title = "Renombrado",
            summary = "Resumen suficientemente largo.",
            roles = new object[] { new { id = backendId, skill = "Backend", isOpen = false }, new { skill = "Diseño UI/UX", isOpen = true } },
        });
        var updated = await resp.ReadAsync<JsonElement>();

        Assert.Equal("Renombrado", updated.GetProperty("title").GetString());
        var roles = updated.GetProperty("roles").EnumerateArray().ToList();
        Assert.Equal(2, roles.Count);
        var backend = roles.First(r => r.GetProperty("skill").GetString() == "Backend");
        Assert.Equal(backendId, backend.GetProperty("id").GetGuid());
        Assert.False(backend.GetProperty("isOpen").GetBoolean());
        Assert.DoesNotContain(roles, r => r.GetProperty("skill").GetString() == "Frontend");
    }

    [Fact]
    public async Task Owner_gets_people_suggestions_per_open_role_and_others_do_not()
    {
        var owner = await TestUser.Register(factory, "Dueño Sugerencias");
        var violinist = await TestUser.Register(factory, "Violinista", "Violín");
        var stranger = await TestUser.Register(factory, "Curioso");
        var project = await owner.CreateProject("Cuarteto", ("Violín", true), ("Chelo", false));
        var id = project.GetProperty("id").GetGuid();

        var suggestions = await owner.Http.GetJsonAsync<JsonElement>($"/api/projects/{id}/suggestions");
        Assert.Equal(1, suggestions.GetArrayLength()); // closed roles are skipped
        var people = suggestions[0].GetProperty("people").EnumerateArray().Select(p => p.GetProperty("id").GetGuid()).ToList();
        Assert.Contains(violinist.Id, people);

        Assert.Equal(HttpStatusCode.Forbidden, (await stranger.Http.GetAsync($"/api/projects/{id}/suggestions")).StatusCode);
    }

    [Fact]
    public async Task Join_flow_apply_then_owner_accepts_and_applicant_becomes_member()
    {
        var owner = await TestUser.Register(factory, "Dueño Equipo");
        var applicant = await TestUser.Register(factory, "Aspirante", "Músico");
        var project = await owner.CreateProject("Banda sonora", ("Músico", true));
        var id = project.GetProperty("id").GetGuid();
        var roleId = project.GetProperty("roles")[0].GetProperty("id").GetGuid();

        var apply = await applicant.Http.PostJsonAsync($"/api/projects/{id}/apply", new { roleId, message = "Me encantaría sumarme." });
        Assert.Equal(HttpStatusCode.OK, apply.StatusCode);

        // A second pending request is refused.
        var again = await applicant.Http.PostJsonAsync($"/api/projects/{id}/apply", new { roleId, message = "Otra vez por si acaso." });
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);

        var inbox = await owner.Http.GetJsonAsync<JsonElement>("/api/inbox");
        Assert.Equal(1, inbox.GetProperty("pending").GetInt32());
        var requestId = inbox.GetProperty("received")[0].GetProperty("id").GetGuid();

        // Only the owner can answer.
        Assert.Equal(HttpStatusCode.Forbidden, (await applicant.Http.PostAsync($"/api/join-requests/{requestId}/accept", null)).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await owner.Http.PostAsync($"/api/join-requests/{requestId}/accept", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await owner.Http.PostAsync($"/api/join-requests/{requestId}/accept", null)).StatusCode);

        var detail = await applicant.Http.GetJsonAsync<JsonElement>($"/api/projects/{id}");
        Assert.True(detail.GetProperty("isMember").GetBoolean());
        Assert.Equal("Accepted", detail.GetProperty("myApplication").GetProperty("status").GetString());
        Assert.Equal(applicant.Id, detail.GetProperty("members")[0].GetProperty("user").GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Cannot_apply_to_own_project_or_to_a_closed_role()
    {
        var owner = await TestUser.Register(factory, "Dueña Cerrada");
        var visitor = await TestUser.Register(factory, "Visitante");
        var project = await owner.CreateProject("Cerrado", ("Backend", false));
        var id = project.GetProperty("id").GetGuid();
        var roleId = project.GetProperty("roles")[0].GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.BadRequest, (await owner.Http.PostJsonAsync($"/api/projects/{id}/apply", new { message = "Yo mismo." })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await visitor.Http.PostJsonAsync($"/api/projects/{id}/apply", new { roleId, message = "Puesto cerrado." })).StatusCode);
    }

    [Fact]
    public async Task Declined_applicant_can_try_again_and_can_withdraw_a_pending_request()
    {
        var owner = await TestUser.Register(factory, "Dueño Rechazo");
        var applicant = await TestUser.Register(factory, "Insistente");
        var project = await owner.CreateProject("Abierto", ("Backend", true));
        var id = project.GetProperty("id").GetGuid();

        await (await applicant.Http.PostJsonAsync($"/api/projects/{id}/apply", new { message = "Primer intento." })).ReadAsync<JsonElement>();
        var requestId = (await owner.Http.GetJsonAsync<JsonElement>($"/api/projects/{id}/requests"))[0].GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NoContent, (await owner.Http.PostAsync($"/api/join-requests/{requestId}/decline", null)).StatusCode);

        var second = await applicant.Http.PostJsonAsync($"/api/projects/{id}/apply", new { message = "Segundo intento." });
        var app = await second.ReadAsync<JsonElement>();
        Assert.Equal("Pending", app.GetProperty("status").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await applicant.Http.DeleteAsync($"/api/join-requests/{app.GetProperty("id").GetGuid()}")).StatusCode);
        Assert.Equal(0, (await owner.Http.GetJsonAsync<JsonElement>($"/api/projects/{id}/requests")).GetArrayLength());
    }

    [Fact]
    public async Task Search_by_text_and_skill_filters_the_feed()
    {
        var owner = await TestUser.Register(factory, "Buscador");
        var needle = $"Zanahoria{Guid.NewGuid():N}"[..20];
        var match = await owner.CreateProject($"Huerta {needle}", ("Fotografía", true));
        await owner.CreateProject("Otra cosa distinta", ("Backend", true));

        var byText = await owner.Http.GetJsonAsync<JsonElement>($"/api/projects?q={needle.ToLowerInvariant()}");
        Assert.Equal([match.GetProperty("id").GetGuid()], Ids(byText));

        var bySkill = await owner.Http.GetJsonAsync<JsonElement>("/api/projects?skill=fotografia&pageSize=30");
        Assert.Contains(match.GetProperty("id").GetGuid(), Ids(bySkill));
    }
}
