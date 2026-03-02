using System.Collections.Concurrent;
using DMS.API.Models;
using DMS.API.Repositories;

namespace DMS.API.Services;

public class AdminService(IAdminRepository repo) : IAdminService
{
    private static readonly ConcurrentDictionary<string, DateTime> ActiveTokens = new();

    public async Task<AdminLoginResponse?> LoginAsync(AdminLoginRequest request)
    {
        var admin = await repo.GetAdminByUsernameAsync(request.Username);
        if (admin is null) return null;

        if (!BCrypt.Net.BCrypt.Verify(request.Password, admin.PasswordHash))
            return null;

        var token = Guid.NewGuid().ToString("N");
        ActiveTokens[token] = DateTime.UtcNow;

        // Clean expired tokens (older than 24 hours)
        var cutoff = DateTime.UtcNow.AddHours(-24);
        foreach (var kv in ActiveTokens)
        {
            if (kv.Value < cutoff) ActiveTokens.TryRemove(kv.Key, out _);
        }

        return new AdminLoginResponse(token, admin.Username);
    }

    public bool ValidateToken(string token)
    {
        if (!ActiveTokens.TryGetValue(token, out var created)) return false;
        if (DateTime.UtcNow - created > TimeSpan.FromHours(24))
        {
            ActiveTokens.TryRemove(token, out _);
            return false;
        }
        return true;
    }
}
