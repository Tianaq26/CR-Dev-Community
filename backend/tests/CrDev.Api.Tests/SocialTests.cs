using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using CrDev.Api.Data;
using CrDev.Api.Services;

namespace CrDev.Api.Tests;

public sealed class SocialTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static async Task<string> Relationship(TestUser viewer, Guid other) =>
        (await viewer.Http.GetJsonAsync<JsonElement>($"/api/users/{other}")).GetProperty("relationship").GetProperty("state").GetString()!;

    [Fact]
    public async Task Friend_request_can_be_sent_accepted_and_removed()
    {
        var a = await TestUser.Register(factory, "Amiga A");
        var b = await TestUser.Register(factory, "Amigo B");

        await (await a.Http.PostJsonAsync("/api/friends/requests", new { userId = b.Id })).ReadAsync<JsonElement>();
        Assert.Equal("requestSent", await Relationship(a, b.Id));
        Assert.Equal("requestReceived", await Relationship(b, a.Id));

        Assert.Equal(HttpStatusCode.Conflict, (await a.Http.PostJsonAsync("/api/friends/requests", new { userId = b.Id })).StatusCode);

        var inbox = await b.Http.GetJsonAsync<JsonElement>("/api/inbox");
        Assert.Equal(1, inbox.GetProperty("pending").GetInt32());
        var requestId = inbox.GetProperty("friendRequests")[0].GetProperty("id").GetGuid();

        // The sender cannot accept their own request.
        Assert.Equal(HttpStatusCode.NotFound, (await a.Http.PostAsync($"/api/friends/requests/{requestId}/accept", null)).StatusCode);
        await (await b.Http.PostAsync($"/api/friends/requests/{requestId}/accept", null)).ReadAsync<JsonElement>();

        Assert.Equal("friends", await Relationship(a, b.Id));
        var friends = await a.Http.GetJsonAsync<JsonElement>("/api/friends");
        Assert.Equal(b.Id, friends[0].GetProperty("id").GetGuid());

        Assert.Equal(HttpStatusCode.NoContent, (await a.Http.DeleteAsync($"/api/friends/{b.Id}")).StatusCode);
        Assert.Equal("none", await Relationship(a, b.Id));
    }

    [Fact]
    public async Task Sending_a_request_to_someone_who_already_asked_me_makes_us_friends()
    {
        var a = await TestUser.Register(factory, "Cruce A");
        var b = await TestUser.Register(factory, "Cruce B");
        await (await a.Http.PostJsonAsync("/api/friends/requests", new { userId = b.Id })).ReadAsync<JsonElement>();

        var crossed = await (await b.Http.PostJsonAsync("/api/friends/requests", new { userId = a.Id })).ReadAsync<JsonElement>();
        Assert.Equal("friends", crossed.GetProperty("state").GetString());
    }

    [Fact]
    public async Task Cannot_befriend_yourself_or_a_ghost()
    {
        var a = await TestUser.Register(factory, "Solitario");
        Assert.Equal(HttpStatusCode.BadRequest, (await a.Http.PostJsonAsync("/api/friends/requests", new { userId = a.Id })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await a.Http.PostJsonAsync("/api/friends/requests", new { userId = Guid.NewGuid() })).StatusCode);
    }

    [Fact]
    public async Task Friends_feed_only_shows_friends_content()
    {
        var me = await TestUser.Register(factory, "Yo");
        var friend = await TestUser.Register(factory, "Mi amigo");
        var stranger = await TestUser.Register(factory, "Un extraño");

        await (await me.Http.PostJsonAsync("/api/friends/requests", new { userId = friend.Id })).ReadAsync<JsonElement>();
        var requestId = (await friend.Http.GetJsonAsync<JsonElement>("/api/inbox")).GetProperty("friendRequests")[0].GetProperty("id").GetGuid();
        await friend.Http.PostAsync($"/api/friends/requests/{requestId}/accept", null);

        var friendProject = await friend.CreateProject("Proyecto del amigo", ("Backend", true));
        await stranger.CreateProject("Proyecto del extraño", ("Backend", true));

        var feed = await me.Http.GetJsonAsync<JsonElement>("/api/projects?feed=friends");
        var ids = feed.GetProperty("items").EnumerateArray().Select(p => p.GetProperty("id").GetGuid()).ToList();
        Assert.Equal([friendProject.GetProperty("id").GetGuid()], ids);
    }

    // ---- Ideas ----------------------------------------------------------------------------

    private static object IdeaBody(string title = "Una idea con potencial", params string[] tags) =>
        new { title, body = "Describo la idea con suficiente detalle para que otros opinen.", tags };

    [Fact]
    public async Task Ideas_collect_feedback_and_offers_of_help()
    {
        var author = await TestUser.Register(factory, "Autora de idea");
        var helper = await TestUser.Register(factory, "Colaborador");

        var idea = await (await author.Http.PostJsonAsync("/api/ideas", IdeaBody("Archivo de oficios", "Fotografía", "Locución"))).ReadAsync<JsonElement>();
        var id = idea.GetProperty("id").GetGuid();
        Assert.True(idea.GetProperty("isOwner").GetBoolean());

        await (await helper.Http.PostJsonAsync($"/api/ideas/{id}/comments", new { kind = "Help", body = "Puedo ayudar con las grabaciones." })).ReadAsync<JsonElement>();
        await (await helper.Http.PostJsonAsync($"/api/ideas/{id}/comments", new { kind = "Feedback", body = "Empieza con tres oficios." })).ReadAsync<JsonElement>();

        var detail = await author.Http.GetJsonAsync<JsonElement>($"/api/ideas/{id}");
        var comments = detail.GetProperty("comments").EnumerateArray().ToList();
        Assert.Equal(["Help", "Feedback"], comments.Select(c => c.GetProperty("kind").GetString()!).ToArray());

        var list = await author.Http.GetJsonAsync<JsonElement>("/api/ideas?authorId=" + author.Id);
        var card = list.GetProperty("items")[0];
        Assert.Equal(1, card.GetProperty("helpCount").GetInt32());
        Assert.Equal(1, card.GetProperty("feedbackCount").GetInt32());
    }

    [Fact]
    public async Task Interest_is_idempotent_and_counted_once_per_person()
    {
        var author = await TestUser.Register(factory, "Idea Interés");
        var fan = await TestUser.Register(factory, "Fan");
        var id = (await (await author.Http.PostJsonAsync("/api/ideas", IdeaBody())).ReadAsync<JsonElement>()).GetProperty("id").GetGuid();

        await fan.Http.PutAsync($"/api/ideas/{id}/interest", null);
        var again = await (await fan.Http.PutAsync($"/api/ideas/{id}/interest", null)).ReadAsync<JsonElement>();
        Assert.Equal(1, again.GetProperty("interest").GetInt32());
        Assert.True(again.GetProperty("interested").GetBoolean());

        var removed = await (await fan.Http.DeleteAsync($"/api/ideas/{id}/interest")).ReadAsync<JsonElement>();
        Assert.Equal(0, removed.GetProperty("interest").GetInt32());
    }

    [Fact]
    public async Task Only_authors_edit_ideas_and_comment_deletion_is_limited()
    {
        var author = await TestUser.Register(factory, "Autor");
        var commenter = await TestUser.Register(factory, "Comentarista");
        var bystander = await TestUser.Register(factory, "Espectador");
        var id = (await (await author.Http.PostJsonAsync("/api/ideas", IdeaBody())).ReadAsync<JsonElement>()).GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.Forbidden, (await commenter.Http.PutJsonAsync($"/api/ideas/{id}", IdeaBody("Cambiada por otro"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await commenter.Http.DeleteAsync($"/api/ideas/{id}")).StatusCode);

        var comment = await (await commenter.Http.PostJsonAsync($"/api/ideas/{id}/comments", new { kind = "Feedback", body = "Comentario mío." })).ReadAsync<JsonElement>();
        var commentId = comment.GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.Forbidden, (await bystander.Http.DeleteAsync($"/api/ideas/{id}/comments/{commentId}")).StatusCode);
        // The idea's author may moderate comments on their own idea.
        Assert.Equal(HttpStatusCode.NoContent, (await author.Http.DeleteAsync($"/api/ideas/{id}/comments/{commentId}")).StatusCode);
    }

    [Fact]
    public async Task ForYou_ideas_match_my_skills_against_the_idea_tags()
    {
        var author = await TestUser.Register(factory, "Autor Tags");
        var illustrator = await TestUser.Register(factory, "Ilustradora", "Ilustración");
        var matching = (await (await author.Http.PostJsonAsync("/api/ideas", IdeaBody("Busca ilustradora", "Ilustración"))).ReadAsync<JsonElement>()).GetProperty("id").GetGuid();
        await author.Http.PostJsonAsync("/api/ideas", IdeaBody("Busca backend", "Backend"));

        var feed = await illustrator.Http.GetJsonAsync<JsonElement>("/api/ideas?feed=foryou&pageSize=30");
        var items = feed.GetProperty("items").EnumerateArray().ToList();
        Assert.Contains(items, i => i.GetProperty("id").GetGuid() == matching && i.GetProperty("isMatch").GetBoolean());
        Assert.DoesNotContain(items, i => i.GetProperty("title").GetString() == "Busca backend");
    }

    // ---- Media ----------------------------------------------------------------------------

    private static readonly byte[] TinyPng = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    private static MultipartFormDataContent FileContent(byte[] bytes, string fileName, string contentType)
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return new MultipartFormDataContent { { file, "file", fileName } };
    }

    [Fact]
    public async Task Uploaded_images_are_served_publicly_with_safe_headers()
    {
        var me = await TestUser.Register(factory, "Sube Imágenes");
        var upload = await (await me.Http.PostAsync("/api/media", FileContent(TinyPng, "foto.png", "image/png"))).ReadAsync<JsonElement>();
        var url = upload.GetProperty("url").GetString()!;
        Assert.StartsWith("/api/media/", url);

        var anonymous = factory.CreateClient(); // <img> tags carry no Authorization header
        var response = await anonymous.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/png", response.Content.Headers.ContentType!.MediaType);
        Assert.Contains("nosniff", response.Headers.GetValues("X-Content-Type-Options"));
        Assert.Equal(TinyPng, await response.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Upload_trusts_file_contents_not_the_name_or_declared_type()
    {
        var me = await TestUser.Register(factory, "Subida Falsa");
        var script = System.Text.Encoding.UTF8.GetBytes("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");

        var fake = await me.Http.PostAsync("/api/media", FileContent(script, "foto.png", "image/png"));
        Assert.Equal(HttpStatusCode.BadRequest, fake.StatusCode);

        var svg = await me.Http.PostAsync("/api/media", FileContent(script, "dibujo.svg", "image/svg+xml"));
        Assert.Equal(HttpStatusCode.BadRequest, svg.StatusCode);
    }

    [Fact]
    public async Task Upload_requires_login_and_rejects_oversized_files()
    {
        var anonymous = await factory.CreateClient().PostAsync("/api/media", FileContent(TinyPng, "foto.png", "image/png"));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        var me = await TestUser.Register(factory, "Sube Grande");
        var big = new byte[4 * 1024 * 1024 + 10];
        TinyPng.CopyTo(big, 0);
        var resp = await me.Http.PostAsync("/api/media", FileContent(big, "grande.png", "image/png"));
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, resp.StatusCode);
    }

    // ---- Catalog / stats --------------------------------------------------------------------

    [Fact]
    public async Task Skill_catalog_and_public_stats_are_available()
    {
        var me = await TestUser.Register(factory, "Catálogo");
        var catalog = await me.Http.GetJsonAsync<JsonElement>("/api/skills");
        Assert.True(catalog.GetProperty("groups").GetArrayLength() >= 3);

        var stats = await factory.CreateClient().GetJsonAsync<JsonElement>("/api/stats");
        Assert.True(stats.GetProperty("members").GetInt32() >= 1);
    }
}

public sealed class UnitTests
{
    [Theory]
    [InlineData("Músico", "musico")]
    [InlineData("  DISEÑO   de   sonido ", "diseno de sonido")]
    [InlineData("Ilustración", "ilustracion")]
    [InlineData("QA / Pruebas", "qa / pruebas")]
    [InlineData("C#", "c#")]
    public void SkillKey_ignores_case_accents_and_extra_spaces(string input, string expected) =>
        Assert.Equal(expected, SkillKey.Of(input));

    [Fact]
    public void SkillKey_clean_dedupes_and_drops_garbage()
    {
        var cleaned = SkillKey.Clean(["Músico", "musico", "", "   ", new string('x', 41), "Bad\u0007Skill", "Guion"]);
        Assert.Equal(["Músico", "Guion"], cleaned.Select(c => c.Name).ToArray());
    }

    [Fact]
    public void Postgres_urls_from_hosting_providers_are_converted()
    {
        var cs = DatabaseSetup.FromUrl("postgresql://app_user:p%40ss%3Aw0rd@db.example.com:6543/crdev?sslmode=require");
        Assert.Contains("Host=db.example.com", cs);
        Assert.Contains("Port=6543", cs);
        Assert.Contains("Database=crdev", cs);
        Assert.Contains("Username=app_user", cs);
        Assert.Contains("Password=p@ss:w0rd", cs);
        Assert.Contains("SSL Mode=Require", cs);
    }

    [Theory]
    [InlineData("https://example.com/x", true)]
    [InlineData("http://example.com", true)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("data:text/html,hi", false)]
    [InlineData("//example.com/x", false)]
    [InlineData("ftp://example.com", false)]
    public void UrlRules_only_allow_http(string url, bool expected) => Assert.Equal(expected, UrlRules.IsHttp(url));
}
