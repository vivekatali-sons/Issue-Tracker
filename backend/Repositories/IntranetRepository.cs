using System.Data;
using Dapper;
using DMS.API.Data;
using DMS.API.Models;

namespace DMS.API.Repositories;

public class IntranetRepository(IIntranetDbConnectionFactory connectionFactory) : IIntranetRepository
{
    public async Task<TokenRedirectResult?> VerifyTokenAsync(string token)
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<TokenRedirectResult>(
            "sp_token_redirect",
            new { action = "read", tokenid = token },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<IntranetEmployee>> SearchEmployeesAsync(string searchTerm)
    {
        using var conn = connectionFactory.CreateConnection();
        return await conn.QueryAsync<IntranetEmployee>(
            """
            SELECT TOP 20
                   CAST(CAST(Emp_ID AS INT) AS NVARCHAR(20)) AS Emp_ID,
                   emp_name AS Emp_Name,
                   department AS Department, designation AS Designation,
                   company_name AS Company_Name,
                   email AS Email
            FROM v_employee_list
            WHERE (Emp_ID LIKE @Search OR emp_name LIKE @Search)
              AND Status = 'A'
            ORDER BY emp_name
            """,
            new { Search = $"%{searchTerm}%" });
    }
}
