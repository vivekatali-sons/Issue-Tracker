using DMS.API.Models;

namespace DMS.API.Repositories;

public interface IIntranetRepository
{
    Task<TokenRedirectResult?> VerifyTokenAsync(string token);
    Task<IEnumerable<IntranetEmployee>> SearchEmployeesAsync(string searchTerm);
}
