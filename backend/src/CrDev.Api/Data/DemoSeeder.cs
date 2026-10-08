using CrDev.Api.Domain;
using CrDev.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace CrDev.Api.Data;

/// <summary>
/// Loads a small, believable community so the app doesn't open empty.
/// Only runs on an empty database. The only account with a known password is the demo one.
/// </summary>
public static class DemoSeeder
{
    public const string DemoEmail = "demo@crdev.community";
    public const string DemoPassword = "demo1234";

    public static async Task SeedAsync(AppDbContext db, ILogger logger)
    {
        if (await db.Users.AnyAsync()) return;
        var now = DateTime.UtcNow;

        // ---- People ------------------------------------------------------------------------
        var mateo = Person("Mateo Salazar", DemoEmail, DemoPassword,
            "Músico y productor, aprendiendo a programar", "San José, Costa Rica",
            "Llevo doce años tocando en bandas de la zona y los últimos tres produciendo música para cortometrajes. " +
            "Ahora estoy aprendiendo a programar para poder construir mis propias herramientas sonoras.",
            ["Músico", "Producción musical", "Composición", "Diseño de sonido"],
            studyInstitution: "Universidad Nacional", studyProgram: "Ingeniería en sonido", daysAgo: 40);

        var marcela = Person("Marcela Rojas", "marcela@example.com", null,
            "Diseñadora de producto e ilustradora", "Medellín, Colombia",
            "Diseño interfaces que se sienten hechas a mano. Me interesan los proyectos que cuentan historias de la gente de campo.",
            ["Diseño UI/UX", "Diseño gráfico", "Ilustración"],
            workCompany: "Estudio Pino", workRole: "Diseñadora de producto", daysAgo: 38);

        var tomas = Person("Tomás Fuentes", "tomas@example.com", null,
            "Desarrollador backend", "Santiago, Chile",
            "Trabajo con .NET y PostgreSQL. Los fines de semana intento que la tecnología sirva a las cooperativas del barrio.",
            ["Backend", "DevOps", "Datos"],
            workCompany: "Cooperativa Digital", workRole: "Desarrollador backend", github: "https://github.com/", daysAgo: 36);

        var lucia = Person("Lucía Paredes", "lucia@example.com", null,
            "Ilustradora y animadora", "Lima, Perú",
            "Dibujo con tinta y acuarela y luego lo llevo a movimiento. Busco proyectos con alma, de los que dejan algo en la comunidad.",
            ["Ilustración", "Animación", "Diseño gráfico"],
            studyInstitution: "Escuela Nacional de Bellas Artes", studyProgram: "Artes visuales", daysAgo: 30);

        var andres = Person("Andrés Quesada", "andres@example.com", null,
            "Desarrollo de videojuegos independientes", "San José, Costa Rica",
            "Diseño juegos de mesa y los llevo a lo digital. Si tu idea cabe en un tablero, probablemente también cabe en una pantalla.",
            ["Videojuegos", "Modelado 3D", "Frontend"],
            workCompany: "Taller Cuatro Esquinas", workRole: "Desarrollador de juegos", daysAgo: 28);

        var camila = Person("Camila Soto", "camila@example.com", null,
            "Desarrolladora frontend", "Bogotá, Colombia",
            "React, accesibilidad y mucho café. Me gusta que las cosas funcionen bien para todo el mundo.",
            ["Frontend", "Diseño UI/UX"],
            workCompany: "Libélula Software", workRole: "Desarrolladora frontend",
            studyInstitution: "Universidad Nacional de Colombia", studyProgram: "Ingeniería de sistemas", daysAgo: 22);

        var diego = Person("Diego Mora", "diego@example.com", null,
            "Estudiante de ingeniería, curioso de las pruebas de software", "Guadalajara, México",
            "Estoy en últimos semestres y quiero ganar experiencia real probando proyectos pequeños.",
            ["QA / Pruebas", "Backend"],
            studyInstitution: "Universidad de Guadalajara", studyProgram: "Ingeniería en computación", daysAgo: 14);

        var sofia = Person("Sofía Herrera", "sofia@example.com", null,
            "Periodista, guionista y podcaster", "Buenos Aires, Argentina",
            "Cuento historias en audio. Si tienes una voz, un micrófono y algo que decir, hablemos.",
            ["Guion", "Redacción", "Traducción", "Locución"],
            workCompany: "Radio Cooperativa", workRole: "Productora", daysAgo: 10);

        User[] people = [mateo, marcela, tomas, lucia, andres, camila, diego, sofia];
        db.Users.AddRange(people);

        // ---- Projects ----------------------------------------------------------------------
        var cuentos = Proj(marcela, "Cuentos del Cafetal",
            "Libro ilustrado e interactivo con relatos orales de familias cafetaleras, ilustraciones animadas y música original.",
            "Estamos recopilando historias de familias que llevan generaciones cosechando café: cómo se vivía la temporada de recolecta, " +
            "las canciones que se cantaban en los beneficios, las recetas de la cocina de la finca.\n\n" +
            "El resultado será un libro digital para leer en el navegador: cada relato tiene una ilustración que cobra vida con un gesto, " +
            "y una pieza musical ambiental que acompaña la lectura. Todo el contenido será libre para escuelas y bibliotecas.\n\n" +
            "Ya tenemos grabadas nueve entrevistas y el estilo visual definido. Nos falta la banda sonora y el lector interactivo.",
            ProjectStatus.Building, 12,
            roles: [("Músico", "Músico", "Piezas ambientales de 2 a 3 minutos, con instrumentos acústicos. Hay referencias de estilo.", true),
                    ("Frontend", "Frontend", "Lector con páginas que se pasan y animaciones suaves. React o similar.", true)]);

        var trueque = Proj(tomas, "Trueque",
            "Mercado de intercambio entre vecinos: objetos, tiempo y habilidades, sin dinero de por medio.",
            "Trueque es una aplicación web para que los vecinos de un barrio puedan ofrecer lo que les sobra y pedir lo que necesitan: " +
            "una escalera prestada, una tarde de clases de guitarra, ayuda con la mudanza.\n\n" +
            "La parte técnica del backend ya está en marcha (.NET y PostgreSQL). Buscamos a alguien que le dé forma a la interfaz " +
            "y a alguien que se anime a probarla con vecinos reales.",
            ProjectStatus.Planning, 9,
            roles: [("Diseño UI/UX", "Diseño UI/UX", "Flujos de publicar y pedir. Pensado para móvil y para personas mayores.", true),
                    ("Frontend", "Frontend", null, true),
                    ("QA / Pruebas", "QA / Pruebas", "Pruebas manuales y reporte de errores, sin necesidad de experiencia previa.", true)]);

        var cosecha = Proj(andres, "La Cosecha",
            "Juego de mesa digital cooperativo: entre todos cuidan una huerta comunitaria durante cuatro estaciones.",
            "La Cosecha nació como un juego de mesa de cartas que probamos con amigos durante dos años. Ahora lo llevamos a la pantalla " +
            "para poder jugarlo a distancia.\n\n" +
            "Cada jugador cuida una parcela, pero el clima afecta a todos: hay que decidir en conjunto qué sembrar y cuándo compartir agua. " +
            "Partidas de veinte minutos, de dos a cuatro personas.\n\n" +
            "El motor y las reglas están terminados. Falta darle un aspecto cálido y un sonido que haga sentir que estás en la huerta.",
            ProjectStatus.Building, 7,
            roles: [("Músico", "Músico", "Música para las cuatro estaciones.", false),
                    ("Ilustración", "Ilustración", "Cartas de cultivos y clima. Estilo grabado o acuarela.", true),
                    ("Diseño de sonido", "Diseño de sonido", "Efectos de tierra, agua, viento y animales.", true)]);

        var semillero = Proj(camila, "Semillero",
            "Mapa colaborativo de huertas urbanas y comunitarias, con calendario de siembra por región.",
            "Queremos que cualquier persona encuentre la huerta comunitaria más cercana, sepa qué se está sembrando y pueda sumarse a una jornada.\n\n" +
            "El mapa se alimenta con aportes de la gente. Necesitamos modelar bien los datos (qué, cuándo, dónde) y un buen logotipo.",
            ProjectStatus.Planning, 4,
            roles: [("Backend", "Backend", "API y modelo de datos geográficos.", true),
                    ("Datos", "Datos", "Calendario de siembra por zona climática.", true),
                    ("Diseño gráfico", "Diseño gráfico", "Identidad: logotipo y paleta.", true)]);

        var voces = Proj(sofia, "Voces del Barrio",
            "Podcast documental con las historias de quienes sostienen los comercios de siempre.",
            "Una serie de ocho episodios, cada uno dedicado a una persona y su oficio: la zapatera, el panadero, la que arregla radios.\n\n" +
            "Ya grabamos los tres primeros y buscamos voz para la narración, alguien que cuide el sonido y música que no se robe el protagonismo.",
            ProjectStatus.Building, 3,
            roles: [("Locución", "Locución", "Voz cálida para narrar la introducción de cada episodio.", true),
                    ("Músico", "Músico", "Cortinas y fondos musicales, con guitarra o piano.", true),
                    ("Diseño de sonido", "Diseño de sonido", "Limpieza y mezcla de entrevistas.", true)]);

        var ritmos = Proj(mateo, "Taller de Ritmos Tradicionales",
            "Sitio para aprender ritmos folclóricos con videos cortos, partituras y práctica con metrónomo.",
            "Quiero reunir en un solo lugar lecciones breves de ritmos tradicionales tocadas por músicos de distintas regiones.\n\n" +
            "Cada lección tendrá un video, la partitura y un metrónomo que sigue el compás. La parte musical la tengo cubierta; " +
            "busco quién me ayude a construir el sitio y a probarlo.",
            ProjectStatus.Planning, 5,
            roles: [("Frontend", "Frontend", "Reproductor con metrónomo sincronizado.", true),
                    ("QA / Pruebas", "QA / Pruebas", null, true)]);

        Project[] projects = [cuentos, trueque, cosecha, semillero, voces, ritmos];
        db.Projects.AddRange(projects);

        // Mateo already plays in La Cosecha.
        cosecha.Members.Add(new ProjectMember { UserId = mateo.Id, RoleTitle = "Músico", JoinedAt = now.AddDays(-4) });

        // ---- Requests ----------------------------------------------------------------------
        var frontendRole = ritmos.Roles.First(r => r.SkillKey == "frontend");
        var qaRole = ritmos.Roles.First(r => r.SkillKey == "qa / pruebas");
        db.JoinRequests.AddRange(
            new JoinRequest
            {
                ProjectId = ritmos.Id, RoleId = frontendRole.Id, ApplicantId = camila.Id,
                Message = "Hola Mateo, me encantó la idea. Trabajo con React a diario y me gustaría encargarme del reproductor. ¿Te parece si lo hablamos?",
                CreatedAt = now.AddDays(-1),
            },
            new JoinRequest
            {
                ProjectId = ritmos.Id, RoleId = qaRole.Id, ApplicantId = diego.Id,
                Message = "Estoy buscando proyectos reales para practicar pruebas. Puedo dedicarle unas cinco horas a la semana.",
                CreatedAt = now.AddHours(-9),
            },
            new JoinRequest
            {
                ProjectId = cosecha.Id, RoleId = cosecha.Roles.First(r => r.SkillKey == "musico").Id, ApplicantId = mateo.Id,
                Message = "Tengo experiencia componiendo para juegos y cortometrajes. Puedo enviarte una maqueta de otoño.",
                Status = JoinRequestStatus.Accepted, CreatedAt = now.AddDays(-6), RespondedAt = now.AddDays(-4),
            });

        // ---- Friends -----------------------------------------------------------------------
        db.Friendships.AddRange(
            Friends(mateo, marcela, now.AddDays(-20)),
            Friends(mateo, andres, now.AddDays(-15)),
            Friends(marcela, tomas, now.AddDays(-18)),
            Friends(marcela, lucia, now.AddDays(-12)),
            Friends(andres, camila, now.AddDays(-9)),
            Friends(sofia, mateo, now.AddDays(-3), accepted: false), // Sofía asked Mateo
            Friends(lucia, mateo, now.AddDays(-2), accepted: false));

        // ---- Ideas -------------------------------------------------------------------------
        var archivo = MakeIdea(sofia, "Un archivo sonoro de oficios que se están perdiendo",
            "Pienso en una colección abierta de grabaciones: el sonido del taller del talabartero, del telar, del horno de leña. " +
            "No solo entrevistas, también el ambiente. Sería un recurso para escuelas, documentales y para quienes quieran escuchar cómo sonaba el trabajo.\n\n" +
            "No sé todavía cómo organizarlo ni dónde alojarlo. Me gustaría empezar con diez oficios de mi ciudad y luego invitar a otras comunidades.",
            ["Diseño de sonido", "Fotografía", "Frontend"], now.AddDays(-2));

        var excedentes = MakeIdea(tomas, "Repartir excedentes de cosecha entre vecinos",
            "En mi calle hay tres limoneros que cada año tiran fruta. Imagino una app sencilla para avisar «tengo limones, pasen por ellos» " +
            "y que quien los necesite reserve. Podría extenderse a verduras de huerta, pan del día y cosas así.",
            ["Móvil", "Diseño UI/UX", "Backend"], now.AddDays(-5));

        var aves = MakeIdea(lucia, "Tarjetas ilustradas de las aves de nuestra región",
            "Un mazo de cartas con aves locales: dibujo, canto y un dato curioso. Pensado para que niños y niñas aprendan a reconocerlas en caminatas. " +
            "Más adelante podría tener un sitio donde escuchar el canto de cada una.",
            ["Ilustración", "Diseño de sonido", "Redacción"], now.AddDays(-7));

        var metronomo = MakeIdea(mateo, "Metrónomo comunitario para practicar en grupo",
            "Una sala donde varias personas se conectan al mismo pulso y practican cada quien desde su casa, aunque no se escuchen. " +
            "Sirve para ensayos a distancia cuando la latencia hace imposible tocar juntos.",
            ["Frontend", "Backend", "Músico"], now.AddDays(-9));

        var guiaQa = MakeIdea(diego, "Guía de pruebas para proyectos que no tienen QA",
            "Casi todos los proyectos pequeños que veo no tienen a nadie que los pruebe. Podríamos escribir una guía corta y práctica " +
            "con listas de verificación para revisar una app antes de lanzarla.",
            ["QA / Pruebas", "Redacción"], now.AddDays(-11));

        Idea[] ideas = [archivo, excedentes, aves, metronomo, guiaQa];
        db.Ideas.AddRange(ideas);

        db.IdeaInterests.AddRange(
            new IdeaInterest { IdeaId = archivo.Id, UserId = mateo.Id },
            new IdeaInterest { IdeaId = archivo.Id, UserId = marcela.Id },
            new IdeaInterest { IdeaId = archivo.Id, UserId = lucia.Id },
            new IdeaInterest { IdeaId = excedentes.Id, UserId = camila.Id },
            new IdeaInterest { IdeaId = excedentes.Id, UserId = mateo.Id },
            new IdeaInterest { IdeaId = aves.Id, UserId = sofia.Id },
            new IdeaInterest { IdeaId = metronomo.Id, UserId = andres.Id });

        db.IdeaComments.AddRange(
            new IdeaComment
            {
                IdeaId = archivo.Id, AuthorId = mateo.Id, Kind = CommentKind.Help, CreatedAt = now.AddDays(-1),
                Body = "Me encantaría ayudar con la grabación y el tratamiento del sonido. Tengo micrófonos de condensador y una grabadora de campo.",
            },
            new IdeaComment
            {
                IdeaId = archivo.Id, AuthorId = marcela.Id, Kind = CommentKind.Feedback, CreatedAt = now.AddHours(-30),
                Body = "Yo empezaría por tres oficios y publicaría cada uno como una pequeña pieza con foto y mapa. Así se ve el avance y es más fácil sumar gente.",
            },
            new IdeaComment
            {
                IdeaId = excedentes.Id, AuthorId = camila.Id, Kind = CommentKind.Feedback, CreatedAt = now.AddDays(-4),
                Body = "Ojo con las reservas: si nadie recoge lo reservado, la fruta se pierde igual. Quizá un tiempo límite de recogida.",
            },
            new IdeaComment
            {
                IdeaId = aves.Id, AuthorId = sofia.Id, Kind = CommentKind.Help, CreatedAt = now.AddDays(-6),
                Body = "Puedo escribir los textos de cada tarjeta y revisar que los datos curiosos sean correctos con una ornitóloga que conozco.",
            });

        await db.SaveChangesAsync();

        await AttachCoversAsync(db, new Dictionary<string, Project>
        {
            ["cuentos"] = cuentos, ["trueque"] = trueque, ["cosecha"] = cosecha, ["voces"] = voces,
        }, logger);

        logger.LogInformation("Seeded demo community. Demo login: {Email} / {Password}", DemoEmail, DemoPassword);
    }

    // ---- builders --------------------------------------------------------------------------

    private static User Person(
        string name, string email, string? password, string headline, string location, string bio, string[] skills,
        string? workCompany = null, string? workRole = null, string? studyInstitution = null, string? studyProgram = null,
        string? github = null, int daysAgo = 0)
    {
        var user = new User
        {
            Name = name, Email = email, Headline = headline, Location = location, Bio = bio,
            WorkCompany = workCompany, WorkRole = workRole, StudyInstitution = studyInstitution, StudyProgram = studyProgram,
            GithubUrl = github,
            PasswordHash = password is null
                ? BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"), 4) // nobody can log in as the others
                : BCrypt.Net.BCrypt.EnhancedHashPassword(password, 11),
            CreatedAt = DateTime.UtcNow.AddDays(-daysAgo),
        };
        foreach (var (key, label) in SkillKey.Clean(skills))
            user.Skills.Add(new UserSkill { UserId = user.Id, Key = key, Name = label });
        return user;
    }

    private static Project Proj(
        User owner, string title, string summary, string description, ProjectStatus status, int daysAgo,
        (string Title, string Skill, string? Description, bool Open)[] roles)
    {
        var project = new Project
        {
            OwnerId = owner.Id, Title = title, Summary = summary, Description = description, Status = status,
            CreatedAt = DateTime.UtcNow.AddDays(-daysAgo), UpdatedAt = DateTime.UtcNow.AddDays(-daysAgo),
        };
        foreach (var (roleTitle, skill, roleDescription, open) in roles)
        {
            var (key, label) = SkillKey.Clean([skill], 1)[0];
            project.Roles.Add(new ProjectRole
            {
                Title = roleTitle, SkillKey = key, SkillName = label, Description = roleDescription, IsOpen = open,
            });
        }
        return project;
    }

    private static Friendship Friends(User a, User b, DateTime at, bool accepted = true) => new()
    {
        RequesterId = a.Id, AddresseeId = b.Id, CreatedAt = at,
        Status = accepted ? FriendshipStatus.Accepted : FriendshipStatus.Pending,
    };

    private static Idea MakeIdea(User author, string title, string body, string[] tags, DateTime at)
    {
        var idea = new Idea { AuthorId = author.Id, Title = title, Body = body, CreatedAt = at };
        foreach (var (key, label) in SkillKey.Clean(tags))
            idea.Tags.Add(new IdeaTag { IdeaId = idea.Id, Key = key, Name = label });
        return idea;
    }

    /// <summary>Optional cover images shipped next to the app (Seed/covers/{name}.jpg); skipped when absent.</summary>
    private static async Task AttachCoversAsync(AppDbContext db, Dictionary<string, Project> byName, ILogger logger)
    {
        var folder = Path.Combine(AppContext.BaseDirectory, "Seed", "covers");
        if (!Directory.Exists(folder)) return;

        foreach (var (name, project) in byName)
        {
            var path = Path.Combine(folder, name + ".jpg");
            if (!File.Exists(path)) continue;

            var data = await File.ReadAllBytesAsync(path);
            var media = new MediaFile { OwnerId = project.OwnerId, ContentType = "image/jpeg", Length = data.Length, Data = data };
            db.MediaFiles.Add(media);
            db.ProjectMedia.Add(new ProjectMedia { ProjectId = project.Id, Kind = MediaKind.Image, Url = $"/api/media/{media.Id}", Position = 0 });
        }
        await db.SaveChangesAsync();
        logger.LogInformation("Attached seed cover images");
    }
}
