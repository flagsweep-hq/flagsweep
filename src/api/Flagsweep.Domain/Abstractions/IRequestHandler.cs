namespace Flagsweep.Domain.Abstractions;

public interface IRequest<TResponse>
    where TResponse : Result, IFailure<TResponse> { }

public interface IRequestHandler<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
    where TResponse : Result, IFailure<TResponse>
{
    Task<TResponse> HandleAsync(TRequest request, CancellationToken ct = default);
}

public interface IDispatcher
{
    Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken ct = default)
        where TResponse : Result, IFailure<TResponse>;
}
