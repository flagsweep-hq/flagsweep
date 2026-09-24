using System.Collections.Frozen;
using Microsoft.Extensions.DependencyInjection;

namespace Flagsweep.Application.Dispatch;

public class Dispatcher(
    IServiceProvider sp,
    FrozenDictionary<Type, Dispatcher.HandlerWrapper> wrappers
) : IDispatcher
{
    public Task<TResponse> Send<TResponse>(
        IRequest<TResponse> request,
        CancellationToken ct = default
    )
        where TResponse : Result, IFailure<TResponse>
    {
        if (!wrappers.TryGetValue(request.GetType(), out var wrapper))
            throw new InvalidOperationException(
                $"No handler registered for request type '{request.GetType().Name}'."
            );
        return ((HandlerWrapper<TResponse>)wrapper).Handle(request, sp, ct);
    }

    public static FrozenDictionary<Type, HandlerWrapper> BuildWrappers(
        IEnumerable<Type> handlerInterfaces
    ) =>
        handlerInterfaces.ToFrozenDictionary(
            iface => iface.GetGenericArguments()[0],
            iface =>
                (HandlerWrapper)
                    Activator.CreateInstance(
                        typeof(HandlerWrapperImpl<,>).MakeGenericType(iface.GetGenericArguments())
                    )!
        );

    public abstract class HandlerWrapper;

    private abstract class HandlerWrapper<TResponse> : HandlerWrapper
        where TResponse : Result, IFailure<TResponse>
    {
        public abstract Task<TResponse> Handle(
            IRequest<TResponse> request,
            IServiceProvider sp,
            CancellationToken ct
        );
    }

    private sealed class HandlerWrapperImpl<TRequest, TResponse> : HandlerWrapper<TResponse>
        where TRequest : IRequest<TResponse>
        where TResponse : Result, IFailure<TResponse>
    {
        public override Task<TResponse> Handle(
            IRequest<TResponse> request,
            IServiceProvider sp,
            CancellationToken ct
        ) =>
            sp.GetRequiredService<IRequestHandler<TRequest, TResponse>>()
                .HandleAsync((TRequest)request, ct);
    }
}
