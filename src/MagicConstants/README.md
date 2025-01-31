# Magic Constants

Magic Constants is a dotnet source generator that generates C# constants from files in your project.
It can also minify files and set cache control headers for routes.

This is especially useful for web projects where you want to reference files in your code without hardcoding the paths nor having to manage the string constants.

Global settings in your project:

```xml
<PropertyGroup>
  <MagicConstantsVisibility>public</MagicConstantsVisibility>
  <MagicConstantsRoutes>true</MagicConstantsRoutes>
  <MagicConstantsRoutesCacheControl>public, max-age=604800</MagicConstantsRoutesCacheControl>
  <MagicConstantsMinify>true</MagicConstantsMinify>
</PropertyGroup>
```

Specific settings
( Note: if not specified, global settings will be used instead )

```xml
<ItemGroup>
  <AdditionalFiles Include="**\*.html" MagicClass="Pages" MagicRemoveRouteExtension="true" MagicCacheControl="public, max-age=86400" MagicMinify="true" />
  <AdditionalFiles Include="**\*.css" MagicClass="Assets" MagicMinify="true" />
  <AdditionalFiles Include="**\*.js" MagicClass="Assets" MagicMinify="true" />
  <AdditionalFiles Include="**\*.svg" MagicClass="Images" />
  <AdditionalFiles Include="**\*.png" MagicClass="Images" />
  <AdditionalFiles Include="**\*.ico" MagicClass="Images" />
</ItemGroup>
```

When `MagicConstantsRoutes` is enabled, it will generate an aspnet route for every file. All you have to do, is call the mapping method:

```csharp
app.MapViews();
```