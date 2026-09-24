namespace Flagsweep.Domain.Abstractions;

public interface IAuditable
{
    DateTime CreatedAt { get; }
    string? CreatedById { get; }
    DateTime? UpdatedAt { get; }
    string? UpdatedById { get; }
}
