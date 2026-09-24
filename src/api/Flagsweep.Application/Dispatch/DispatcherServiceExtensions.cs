using Flagsweep.Application.Validation;
using Microsoft.Extensions.DependencyInjection;

namespace Flagsweep.Application.Dispatch;

public static class DispatcherServiceExtensions
{
    public static IServiceCollection AddDispatcher(this IServiceCollection services)
    {
        var handlerInterface = typeof(IRequestHandler<,>);
        var handlerTypes = typeof(DispatcherServiceExtensions)
            .Assembly.GetTypes()
            .Where(t =>
                t is { IsAbstract: false, IsInterface: false, IsGenericTypeDefinition: false }
                && t.GetInterfaces()
                    .Any(i => i.IsGenericType && i.GetGenericTypeDefinition() == handlerInterface)
            );

        var handlerInterfaces = new List<Type>();
        foreach (var handlerType in handlerTypes)
        {
            services.AddScoped(handlerType);
            foreach (
                var iface in handlerType
                    .GetInterfaces()
                    .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == handlerInterface)
            )
            {
                handlerInterfaces.Add(iface);
                var validationType = typeof(ValidationDecorator<,>).MakeGenericType(
                    iface.GetGenericArguments()
                );
                services.AddScoped(
                    iface,
                    sp =>
                        ActivatorUtilities.CreateInstance(
                            sp,
                            validationType,
                            sp.GetRequiredService(handlerType)
                        )
                );
            }
        }

        var wrappers = Dispatcher.BuildWrappers(handlerInterfaces);
        services.AddScoped<IDispatcher>(sp => new Dispatcher(sp, wrappers));
        return services;
    }
}
