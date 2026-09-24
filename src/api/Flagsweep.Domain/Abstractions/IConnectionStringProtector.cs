namespace Flagsweep.Domain.Abstractions;

public interface IConnectionStringProtector
{
    string Protect(string plainText);
    string Unprotect(string protectedText);
}
