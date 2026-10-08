namespace CrDev.Api.Data;

public static class DbInitializer
{
    /// <summary>
    /// Creates the schema if needed and optionally loads demo content.
    /// Retries because free-tier databases can take a while to wake up.
    /// </summary>
    public static async Task RunAsync(IServiceProvider services, ILogger logger)
    {
        const int attempts = 8;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                using var scope = services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
                var env = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();

                await db.Database.EnsureCreatedAsync();

                var seed = config.GetValue<bool?>("SEED_DEMO") ?? env.IsDevelopment();
                if (seed) await DemoSeeder.SeedAsync(db, logger);
                return;
            }
            catch (Exception ex) when (attempt < attempts)
            {
                var delay = TimeSpan.FromSeconds(Math.Min(2 * attempt, 10));
                logger.LogWarning(ex, "Database not ready (attempt {Attempt}/{Max}); retrying in {Delay}s", attempt, attempts, delay.TotalSeconds);
                await Task.Delay(delay);
            }
        }
    }
}
