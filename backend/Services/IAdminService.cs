using DMS.API.Models;

namespace DMS.API.Services;

public interface IAdminService
{
    Task<AdminLoginResponse?> LoginAsync(AdminLoginRequest request);
    bool ValidateToken(string token);
}
