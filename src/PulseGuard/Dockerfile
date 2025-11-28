#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["PulseGuard/PulseGuard.csproj", "PulseGuard/"]
COPY ["PulseGuard.Views.V2/PulseGuard.Views.V2.csproj", "PulseGuard.Views.V2/"]
COPY ["PulseGuard.Views/PulseGuard.Views.csproj", "PulseGuard.Views/"]
RUN dotnet restore "./PulseGuard/PulseGuard.csproj"
COPY . .
WORKDIR "/src/PulseGuard"
RUN dotnet build "./PulseGuard.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./PulseGuard.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PulseGuard.dll"]
