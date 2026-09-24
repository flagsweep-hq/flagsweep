namespace Flagsweep.Domain;

public enum ErrorType
{
    Validation,
    NotFound,
    Conflict,
    Unauthorized,
    Forbidden,
}

public record Error(string Code, string Message, ErrorType Type)
{
    public static Error Validation(string message, string? code = null) =>
        new(code ?? "validation", message, ErrorType.Validation);

    public static Error NotFound(string message, string? code = null) =>
        new(code ?? "not_found", message, ErrorType.NotFound);

    public static Error Conflict(string message, string? code = null) =>
        new(code ?? "conflict", message, ErrorType.Conflict);

    public static Error Unauthorized(string message, string? code = null) =>
        new(code ?? "unauthorized", message, ErrorType.Unauthorized);

    public static Error Forbidden(string message, string? code = null) =>
        new(code ?? "forbidden", message, ErrorType.Forbidden);
}

public interface IFailure<TSelf>
    where TSelf : IFailure<TSelf>
{
    static abstract TSelf Fail(Error error);
}

public class Result : IFailure<Result>
{
    public Error? Error { get; }
    public bool IsSuccess => Error is null;
    public bool IsFailure => Error is not null;

    protected Result() { }

    protected Result(Error error) => Error = error;

    public static Result Ok() => new();

    public static Result Fail(Error error) => new(error);

    public static implicit operator Result(Error error) => Fail(error);
}

public class Result<T> : Result, IFailure<Result<T>>
{
    public T? Value { get; }

    private Result(T value) => Value = value;

    private Result(Error error)
        : base(error) { }

    public static Result<T> Ok(T value) => new(value);

    public static new Result<T> Fail(Error error) => new(error);

    public static implicit operator Result<T>(T value) => Ok(value);

    public static implicit operator Result<T>(Error error) => Fail(error);
}
