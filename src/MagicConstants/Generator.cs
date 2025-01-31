using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using NUglify;
using FileOptions = (string? Class, bool RemoveRouteExtension, Microsoft.CodeAnalysis.AdditionalText File, string? CacheControl, bool? Minify);
using GlobalOptions = (string Namespace, string Visibility, bool Routes, string? CacheControl, bool Minify, string? ProjectDirectory);

namespace MagicConstants;

[Generator]
public class Generator : IIncrementalGenerator
{
    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        IncrementalValueProvider<GlobalOptions> globalOptions = context.AnalyzerConfigOptionsProvider.Select(static (provider, _) =>
        (
            Namespace: GetGlobalOption(provider, "rootnamespace") ?? "MagicConstants",
            Visibility: GetGlobalOption(provider, "MagicConstantsVisibility") ?? "internal",
            Routes: bool.TryParse(GetGlobalOption(provider, "MagicConstantsRoutes"), out bool routes) && routes,
            CacheControl: GetGlobalOption(provider, "MagicConstantsRoutesCacheControl"),
            Minify: bool.TryParse(GetGlobalOption(provider, "MagicConstantsMinify"), out bool minify) && minify,
            ProjectDirectory: GetGlobalOption(provider, "projectdir")
        ));

        IncrementalValuesProvider<FileOptions> additionalFiles = context.AdditionalTextsProvider.Combine(context.AnalyzerConfigOptionsProvider)
                                     .Select(static (pair, _) =>
                                     {
                                         string? @class = GetAdditionalFileMetadata(pair.Right, pair.Left, "MagicClass");

                                         string? removeRouteString = GetAdditionalFileMetadata(pair.Right, pair.Left, "MagicRemoveRouteExtension");
                                         bool removeRouteExtension = removeRouteString != null && bool.TryParse(removeRouteString, out bool remove) && remove;
                                         string? cacheControl = GetAdditionalFileMetadata(pair.Right, pair.Left, "MagicCacheControl");

                                         string? shouldMinifyString = GetAdditionalFileMetadata(pair.Right, pair.Left, "MagicMinify");
                                         bool? shouldMinify = shouldMinifyString == null ? null : bool.TryParse(shouldMinifyString, out bool minify) && minify;
                                         
                                         return (Class: @class, RemoveRouteExtension: removeRouteExtension, File: pair.Left, CacheControl: cacheControl, Minify: shouldMinify);
                                     })
                                     .Where(static pair => pair.Class is not null);

        IncrementalValuesProvider<(FileOptions FileOptions, GlobalOptions GlobalOptions)> combined = additionalFiles.Combine(globalOptions);

        context.RegisterSourceOutput(combined, static (spc, pair) =>
        {
            AdditionalText file = pair.FileOptions.File;
            string content, type;

            string extension = Path.GetExtension(file.Path)?.ToLowerInvariant() ?? "";

            //TODO: add more binary types
            if (extension is ".png" or ".jpg" or ".jpeg" or ".gif" or ".bmp" or ".ico" or ".webp")
            {
#pragma warning disable RS1035 // Do not use APIs banned for analyzers
                byte[] bytes = File.ReadAllBytes(file.Path);
#pragma warning restore RS1035 // Do not use APIs banned for analyzers
                content = "new byte[] { " + string.Join(", ", bytes) + " }";
                type = "static readonly byte[]";
            }
            else
            {
                content = file.GetText()?.ToString() ?? "";

                if ((pair.FileOptions.Minify.HasValue && pair.FileOptions.Minify.GetValueOrDefault()) || pair.GlobalOptions.Minify)
                {
                    if (extension is ".html" or ".htm")
                    {
                        UglifyResult result = Uglify.Html(content);

                        if (!result.HasErrors)
                        {
                            content = result.Code;
                        }
                    }
                    else if (extension is ".css")
                    {
                        UglifyResult result = Uglify.Css(content);
                        if (!result.HasErrors)
                        {
                            content = result.Code;
                        }
                    }
                    else if (extension is ".js")
                    {
                        UglifyResult result = Uglify.Js(content);
                        if (!result.HasErrors)
                        {
                            content = result.Code;
                        }
                    }
                }

                content = "@\"" + (content?.Replace("\"", "\"\"")) + "\"";
                type = "const string";
            }

            string @class = SafeString(pair.FileOptions.Class, includeSlashes: true);
            string @namespace = pair.GlobalOptions.Namespace;
            string visibility = pair.GlobalOptions.Visibility;

            string filename;

            if (pair.GlobalOptions.ProjectDirectory is not null)
            {
                filename = file.Path.Substring(pair.GlobalOptions.ProjectDirectory.Length);
            }
            else
            {
                filename = Path.GetFileName(file.Path);
            }

            filename = filename.Replace("\\", "/");
            string routeName = filename;
            filename = SafeString(filename, includeSlashes: false);

            spc.AddSource(
                hintName: $"{@class}.{filename.Replace('/', '_')}.g.cs",
                source: GetFileTemplate(content, type, @class, @namespace, visibility, filename));

            if (pair.GlobalOptions.Routes)
            {
                if (routeName is "index.html" or "index.htm")
                {
                    routeName = "";
                }
                else if (routeName.EndsWith("/index.htm"))
                {
                    routeName = routeName.Substring(0, routeName.Length - "/index.htm".Length);
                }
                else if (routeName.EndsWith("/index.html"))
                {
                    routeName = routeName.Substring(0, routeName.Length - "/index.html".Length);
                }
                else if (pair.FileOptions.RemoveRouteExtension)
                {
                    routeName = routeName.Substring(0, routeName.Length - extension.Length);
                }

                string parameters = "HttpContext context";
                string cacheControl;

                string? cacheControlOptions = !string.IsNullOrEmpty(pair.FileOptions.CacheControl) ? pair.FileOptions.CacheControl : pair.GlobalOptions.CacheControl;
                if (string.IsNullOrEmpty(cacheControlOptions))
                {
                    parameters = "";
                    cacheControl = "";
                }
                else
                {
                    parameters = "HttpContext context";
                    cacheControl = $@"
                context.Response.Headers.CacheControl = ""{cacheControlOptions}"";";
                }

                spc.AddSource(
                hintName: $"Routes.{@class}.{filename.Replace('/', '_')}.g.cs",
                source: $@"using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using System.Net.Mime;
#nullable enable

namespace {@namespace}
{{
    {visibility} static partial class Routes
    {{
        public static void Map{FirstToUpper(filename.Replace('/', '_'))}(this IEndpointRouteBuilder app)
        {{
            app.Map{FirstToUpper(filename.Replace('/', '_'))}(""{routeName}"");
        }}

        public static void Map{FirstToUpper(filename.Replace('/', '_'))}(this IEndpointRouteBuilder app, string route)
        {{
            app.MapGet(""/"" + route, ({parameters}) =>
            {{{cacheControl}
                return TypedResults.Text({@class}.{string.Join(".", filename.Split('/').Select(FirstToUpper))}, {GetMimeType(extension)});
            }}); 
        }}
    }}
}}");
            }
        });

        context.RegisterSourceOutput(combined.Collect(), static (spc, files) =>
        {
            if (!files.Any(pair => pair.GlobalOptions.Routes))
            {
                return;
            }

            IEnumerable<string> filenames = files.Select(pair =>
            {
                string filename = pair.GlobalOptions.ProjectDirectory != null
                    ? pair.FileOptions.File.Path.Substring(pair.GlobalOptions.ProjectDirectory.Length)
                    : Path.GetFileName(pair.FileOptions.File.Path);

                return filename.Replace("\\", "/");
            })
            .OrderBy(filename => Path.GetExtension(filename).ToLowerInvariant() switch
            {
                ".html" or ".htm" => 0,
                ".css" => 1,
                ".js" => 2,
                _ => 3
            })
            .ThenBy(filename => filename.Count(x => x == '/'))
            .Select(filename => $"            app.Map{FirstToUpper(SafeString(filename, includeSlashes: true))}();");

            string @namespace = files[0].GlobalOptions.Namespace;
            string visibility = files[0].GlobalOptions.Visibility;

            spc.AddSource(
            hintName: $"Routes.g.cs",
            source: $@"using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using System.Net.Mime;
#nullable enable

namespace {@namespace}
{{
    {visibility} static partial class Routes
    {{
        public static void MapViews(this IEndpointRouteBuilder app)
        {{
{string.Join("\r\n", filenames)}
        }}
    }}
}}");
        });

    }

    private static string GetFileTemplate(string content, string type, string @class, string @namespace, string visibility, string filename)
    {
        string[] inners = filename.Split('/');

        string result = $@"
public {type} {FirstToUpper(inners.Last())} = {content};
";

        for (int i = inners.Length - 2; i >= 0; i--)
        {
            result = $@"
    {visibility} static partial class {FirstToUpper(inners[i])}
    {{
        {result}
    }}
";
        }

        return $@"namespace {@namespace}
{{
    {visibility} static partial class {@class}
    {{
        {result}
    }}
}}
";
    }

    private static string FirstToUpper(string filename) => char.ToUpper(filename[0]) + filename.Substring(1);

    private static string GetMimeType(string extension)
    {
        return extension switch
        {
            ".jpg" or ".jpeg" => "MediaTypeNames.Image.Jpeg",
            ".gif" => "MediaTypeNames.Image.Gif",
            ".bmp" => "MediaTypeNames.Image.Bmp",
            ".ico" => "MediaTypeNames.Image.Icon",
            ".png" => "MediaTypeNames.Image.Png",
            ".svg" => "MediaTypeNames.Image.Svg",
            ".webp" => "MediaTypeNames.Image.Webp",

            ".html" or ".htm" => "MediaTypeNames.Text.Html",
            ".css" => "MediaTypeNames.Text.Css",
            ".js" => "MediaTypeNames.Text.JavaScript",
            ".xml" => "MediaTypeNames.Text.Xml",

            //TODO: add more mime types

            _ => "MediaTypeNames.Text.Plain",
        };
    }

    private static string? GetGlobalOption(AnalyzerConfigOptionsProvider provider, string name)
    {
        if (provider.GlobalOptions.TryGetValue($"build_property.{name}", out string? value))
        {
            if (!string.IsNullOrEmpty(value))
            {
                return value;
            }
        }

        return null;
    }

    private static string? GetAdditionalFileMetadata(AnalyzerConfigOptionsProvider provider, AdditionalText file, string name)
    {
        if (provider.GetOptions(file).TryGetValue($"build_metadata.AdditionalFiles.{name}", out string? value))
        {
            if (!string.IsNullOrEmpty(value))
            {
                return value;
            }
        }

        return null;
    }

    private static string SafeString(string? value, bool includeSlashes)
    {
        if (value is null)
        {
            return "";
        }

        string result = value.Replace(".", "_")
                             .Replace("-", "_")
                             .Replace("{", "_")
                             .Replace("}", "_")
                             .Replace(" ", "_");

        if (includeSlashes)
        {
            result = result.Replace("/", "_").Replace("\\", "_");
        }

        return result;
    }
}