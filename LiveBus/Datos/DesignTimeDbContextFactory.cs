using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace LiveBus
{
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<LiveBusContext>
    {
        public LiveBusContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<LiveBusContext>();

            // Cargar la configuración de la aplicación desde el archivo appsettings.json
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .Build();

            // Configurar el DbContext con la cadena de conexión
            optionsBuilder.UseSqlServer(configuration.GetConnectionString("LiveBusDB"));

            return new LiveBusContext(optionsBuilder.Options);
        }
    }
}
