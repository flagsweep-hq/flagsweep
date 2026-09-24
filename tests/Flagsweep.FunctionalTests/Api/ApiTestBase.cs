namespace Flagsweep.FunctionalTests.Api;

public abstract class ApiTestBase(FunctionalTestFixture fixture) : FunctionalTestBase(fixture)
{
    protected override bool AuthenticateByDefault => true;
}
