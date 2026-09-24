using Flagsweep.Domain.Models;

namespace Flagsweep.UnitTests.Domain;

public class FeatureFlagTests
{
    private static FeatureFlag CreateFlag(
        bool isEnabled = false,
        string? description = null,
        string? displayName = null
    ) => new("test-flag", "key", "label", isEnabled, description, displayName, null);

    [Fact]
    public void Toggle_WhenDisabled_ReturnsEnabled()
    {
        var flag = CreateFlag(isEnabled: false);

        var toggled = flag.Toggle();

        toggled.IsEnabled.Should().BeTrue();
        toggled.Id.Should().Be(flag.Id);
    }

    [Fact]
    public void Toggle_WhenEnabled_ReturnsDisabled()
    {
        var flag = CreateFlag(isEnabled: true);

        var toggled = flag.Toggle();

        toggled.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void WithUpdatedMetadata_UpdatesBothFields()
    {
        var flag = CreateFlag(description: "old desc", displayName: "old name");

        var updated = flag.WithUpdatedMetadata("new name", "new desc");

        updated.DisplayName.Should().Be("new name");
        updated.Description.Should().Be("new desc");
    }

    [Fact]
    public void WithUpdatedMetadata_NullKeepsExisting()
    {
        var flag = CreateFlag(description: "keep me", displayName: "keep me too");

        var updated = flag.WithUpdatedMetadata(null, null);

        updated.DisplayName.Should().Be("keep me too");
        updated.Description.Should().Be("keep me");
    }

    [Fact]
    public void WithUpdatedMetadata_PartialUpdate()
    {
        var flag = CreateFlag(description: "old desc", displayName: "old name");

        var updated = flag.WithUpdatedMetadata("new name", null);

        updated.DisplayName.Should().Be("new name");
        updated.Description.Should().Be("old desc");
    }
}
