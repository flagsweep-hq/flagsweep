namespace Flagsweep.Domain;

public class FlagLockedException(string flagId, Exception? inner = null)
    : Exception($"Flag '{flagId}' is locked (read-only) in the store.", inner);
