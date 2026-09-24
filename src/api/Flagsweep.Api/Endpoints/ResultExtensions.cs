using Flagsweep.Domain;

namespace Flagsweep.Api.Endpoints;

public static class ResultExtensions
{
    public static IResult ToResponse(this Result result)
    {
        return result.IsSuccess ? Results.NoContent() : ToProblem(result.Error!);
    }

    public static IResult ToResponse<T>(this Result<T> result, Func<T, string>? createdAt = null)
    {
        if (result.IsFailure)
            return ToProblem(result.Error!);

        return createdAt is not null
            ? Results.Created(createdAt(result.Value!), result.Value)
            : Results.Ok(result.Value);
    }

    private static IResult ToProblem(Error error)
    {
        var statusCode = error.Type switch
        {
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status500InternalServerError,
        };

        return Results.Problem(
            title: error.Type.ToString(),
            detail: error.Message,
            statusCode: statusCode,
            extensions: new Dictionary<string, object?> { ["code"] = error.Code }
        );
    }
}
