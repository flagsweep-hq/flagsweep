namespace Flagsweep.Application.Validation;

public class ValidationDecorator<TRequest, TResponse>(
    IRequestHandler<TRequest, TResponse> inner,
    IEnumerable<IValidator<TRequest>> validators
) : IRequestHandler<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
    where TResponse : Result, IFailure<TResponse>
{
    public async Task<TResponse> HandleAsync(TRequest request, CancellationToken ct = default)
    {
        var failures = new List<FluentValidation.Results.ValidationFailure>();

        foreach (var validator in validators)
        {
            var result = await validator.ValidateAsync(request, ct);
            if (!result.IsValid)
                failures.AddRange(result.Errors);
        }

        if (failures.Count <= 0)
            return await inner.HandleAsync(request, ct);

        var message = string.Join("; ", failures.Select(f => f.ErrorMessage));
        return TResponse.Fail(Error.Validation(message));
    }
}
