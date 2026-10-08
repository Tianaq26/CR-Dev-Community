using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace CrDev.Api.Services;

/// <summary>
/// Turns model-state errors into one consistent, Spanish ProblemDetails shape:
/// { title, status: 400, errors: { camelCaseField: ["mensaje"] } }.
/// </summary>
public static partial class ValidationProblems
{
    public static ValidationProblemDetails From(ModelStateDictionary state)
    {
        var errors = state
            .Where(e => e.Value is { Errors.Count: > 0 })
            .GroupBy(e => Field(e.Key))
            .ToDictionary(
                g => g.Key,
                g => g.SelectMany(e => e.Value!.Errors).Select(e => Translate(e.ErrorMessage)).Distinct().ToArray());

        return new ValidationProblemDetails(errors)
        {
            Title = "Revisa los datos del formulario.",
            Status = StatusCodes.Status400BadRequest,
        };
    }

    private static string Field(string key)
    {
        var last = key.Split('.').Last();
        if (last.Length == 0) return "body";
        var name = last.Split('[').First(); // "Roles[0]" -> "Roles"
        return JsonNamingPolicy.CamelCase.ConvertName(name);
    }

    [GeneratedRegex(@"must be a string with a minimum length of (\d+)")]
    private static partial Regex MinLength();

    [GeneratedRegex(@"maximum length of '?(\d+)'?")]
    private static partial Regex MaxLength();

    [GeneratedRegex(@"must be a string or array type with a maximum length of '?(\d+)'?")]
    private static partial Regex MaxItems();

    public static string Translate(string message)
    {
        // Messages written in Spanish by our own code pass straight through.
        if (message.Contains("is required", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("field is required", StringComparison.OrdinalIgnoreCase))
            return "Este campo es obligatorio.";

        if (message.Contains("not a valid e-mail", StringComparison.OrdinalIgnoreCase))
            return "Escribe un correo válido.";

        if (MinLength().Match(message) is { Success: true } min)
            return $"Es demasiado corto (mínimo {min.Groups[1].Value} caracteres).";

        if (MaxItems().Match(message) is { Success: true } items)
            return $"Hay demasiados elementos (máximo {items.Groups[1].Value}).";

        if (MaxLength().Match(message) is { Success: true } max)
            return $"Es demasiado largo (máximo {max.Groups[1].Value} caracteres).";

        if (message.Contains("could not be converted", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("is invalid", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("not valid", StringComparison.OrdinalIgnoreCase))
            return "El valor no es válido.";

        return message;
    }
}
