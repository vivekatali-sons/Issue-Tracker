using System.Data;
using Microsoft.Data.SqlClient;

namespace DMS.API.Data;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
}

public class SqlServerConnectionFactory(string connectionString) : IDbConnectionFactory
{
    public IDbConnection CreateConnection() => new SqlConnection(connectionString);
}

public interface IIntranetDbConnectionFactory
{
    IDbConnection CreateConnection();
}

public class IntranetConnectionFactory(string connectionString) : IIntranetDbConnectionFactory
{
    public IDbConnection CreateConnection() => new SqlConnection(connectionString);
}
