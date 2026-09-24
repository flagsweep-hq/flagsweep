using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;

namespace Flagsweep.FunctionalTests;

public static class FlociAz
{
    private const int AppConfigPort = 4577;

    private const string AccountKey =
        "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMh0==";

    private static readonly Lazy<Task<IContainer>> Container = new(
        StartContainerAsync,
        LazyThreadSafetyMode.ExecutionAndPublication
    );

    private static async Task<IContainer> StartContainerAsync()
    {
        var container = new ContainerBuilder("floci/floci-az:latest")
            .WithPortBinding(AppConfigPort, assignRandomHostPort: true)
            .WithWaitStrategy(
                Wait.ForUnixContainer()
                    .UntilHttpRequestIsSucceeded(request =>
                        request.ForPort(AppConfigPort).ForPath("/devstoreaccount1-appconfig/kv")
                    )
            )
            .Build();
        await container.StartAsync();
        return container;
    }

    public static async Task<string> NewStoreConnectionStringAsync()
    {
        var container = await Container.Value;
        var account = $"t{Guid.NewGuid():N}";
        return $"Endpoint=http://{container.Hostname}:{container.GetMappedPublicPort(AppConfigPort)}/{account}-appconfig;"
            + $"Id={account};Secret={AccountKey}";
    }
}
