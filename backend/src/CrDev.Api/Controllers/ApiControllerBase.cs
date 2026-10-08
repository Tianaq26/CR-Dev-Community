using System.Security.Claims;
using CrDev.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrDev.Api.Controllers;

[ApiController, Authorize]
public abstract class ApiControllerBase : ControllerBase
{
    protected Guid UserId =>
        Guid.TryParse(User.FindFirstValue("sub"), out var id) ? id : throw new UnauthorizedAccessException();

    protected ObjectResult Fail(int status, string message) =>
        Problem(detail: message, statusCode: status, title: message);

    protected ActionResult Invalid(string field, string message)
    {
        ModelState.AddModelError(field, message);
        return new BadRequestObjectResult(ValidationProblems.From(ModelState)) { ContentTypes = { "application/problem+json" } };
    }

    protected static int ClampPage(int page) => Math.Max(1, page);
    protected static int ClampSize(int size, int max = 30) => Math.Clamp(size, 1, max);
}
