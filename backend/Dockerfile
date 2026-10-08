# Build context: this folder (backend/).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so the layer is cached until the project file changes.
COPY src/CrDev.Api/CrDev.Api.csproj src/CrDev.Api/
RUN dotnet restore src/CrDev.Api/CrDev.Api.csproj

COPY src/CrDev.Api src/CrDev.Api
RUN dotnet publish src/CrDev.Api/CrDev.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0

# The host (Railway, Render, Fly…) injects PORT; Program.cs binds to it. 8080 is the local fallback.
ENV PORT=8080
EXPOSE 8080

# Never run as root.
USER $APP_UID
ENTRYPOINT ["dotnet", "CrDev.Api.dll"]
