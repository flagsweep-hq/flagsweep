using Flagsweep.Domain;

namespace Flagsweep.UnitTests.Domain;

public class ResultTests
{
    [Fact]
    public void Ok_IsSuccess()
    {
        var result = Result.Ok();

        result.IsSuccess.Should().BeTrue();
        result.IsFailure.Should().BeFalse();
        result.Error.Should().BeNull();
    }

    [Fact]
    public void Fail_IsFailure()
    {
        var result = Result.Fail(Error.NotFound("not found"));

        result.IsFailure.Should().BeTrue();
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().NotBeNull();
    }

    [Fact]
    public void ImplicitConversion_ErrorToResult()
    {
        Result result = Error.Validation("bad input");

        result.IsFailure.Should().BeTrue();
        result.Error!.Type.Should().Be(ErrorType.Validation);
    }

    [Fact]
    public void GenericResult_Ok_HasValue()
    {
        var result = Result<int>.Ok(42);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(42);
    }

    [Fact]
    public void GenericResult_Fail_HasError()
    {
        var result = Result<int>.Fail(Error.NotFound("nope"));

        result.IsFailure.Should().BeTrue();
        result.Error!.Message.Should().Be("nope");
    }

    [Fact]
    public void GenericResult_ImplicitFromValue()
    {
        Result<string> result = "hello";

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("hello");
    }

    [Fact]
    public void GenericResult_ImplicitFromError()
    {
        Result<string> result = Error.Conflict("conflict");

        result.IsFailure.Should().BeTrue();
        result.Error!.Type.Should().Be(ErrorType.Conflict);
    }

    [Theory]
    [InlineData(ErrorType.Validation)]
    [InlineData(ErrorType.NotFound)]
    [InlineData(ErrorType.Conflict)]
    [InlineData(ErrorType.Unauthorized)]
    [InlineData(ErrorType.Forbidden)]
    public void Error_FactoryMethods_SetCorrectType(ErrorType expectedType)
    {
        var error = expectedType switch
        {
            ErrorType.Validation => Error.Validation("msg"),
            ErrorType.NotFound => Error.NotFound("msg"),
            ErrorType.Conflict => Error.Conflict("msg"),
            ErrorType.Unauthorized => Error.Unauthorized("msg"),
            ErrorType.Forbidden => Error.Forbidden("msg"),
            _ => throw new ArgumentOutOfRangeException(),
        };

        error.Type.Should().Be(expectedType);
        error.Message.Should().Be("msg");
    }
}
