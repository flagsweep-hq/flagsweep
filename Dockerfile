FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend-build
WORKDIR /app/web
COPY src/web/package.json src/web/package-lock.json ./
RUN npm ci
COPY src/web/ ./
RUN npm run build

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
ARG TARGETARCH
ARG VERSION=0.0.0
WORKDIR /app
COPY Directory.Build.props .editorconfig ./
COPY src/api/ ./
RUN dotnet restore Flagsweep.Api/Flagsweep.Api.csproj -a $TARGETARCH
RUN dotnet publish Flagsweep.Api/Flagsweep.Api.csproj -c Release -a $TARGETARCH --no-restore \
    -p:Version=$VERSION -o /out

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend-build /out .
COPY --from=frontend-build /app/web/dist ./wwwroot

RUN mkdir -p /app/data && chown app:app /app/data
# Honour X-Forwarded-Proto / X-Forwarded-For from a reverse proxy, so invite and
# password-reset links use the public https URL. Override with =false to disable.
ENV ASPNETCORE_FORWARDEDHEADERS_ENABLED=true
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "Flagsweep.Api.dll"]
