using System.Collections.Concurrent;

namespace DMS.API.Services;

/// <summary>
/// In-memory session store for authenticated user sessions.
/// Created when verify-token succeeds; validated on every API request.
/// </summary>
public static class SessionStore
{
    private static readonly ConcurrentDictionary<string, (string UserId, DateTime Expiry)> Sessions = new();

    private static readonly TimeSpan SessionLifetime = TimeSpan.FromHours(8);

    public static string Create(string userId)
    {
        // Cleanup expired sessions (piggyback on create)
        var now = DateTime.UtcNow;
        foreach (var kvp in Sessions)
        {
            if (kvp.Value.Expiry < now) Sessions.TryRemove(kvp.Key, out _);
        }

        var token = Guid.NewGuid().ToString("N");
        Sessions[token] = (userId, now.Add(SessionLifetime));
        return token;
    }

    public static string? Validate(string? token)
    {
        if (string.IsNullOrEmpty(token)) return null;
        if (!Sessions.TryGetValue(token, out var session)) return null;
        if (session.Expiry < DateTime.UtcNow)
        {
            Sessions.TryRemove(token, out _);
            return null;
        }
        return session.UserId;
    }
}
