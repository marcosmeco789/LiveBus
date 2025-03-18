using Microsoft.EntityFrameworkCore;
using LiveBus.Modelos;

namespace LiveBus
{
    public class LiveBusContext : DbContext
    {
        public LiveBusContext(DbContextOptions<LiveBusContext> options) : base(options) { }

        public DbSet<Autobus> Autobuses { get; set; }
        public DbSet<Ruta> Rutas { get; set; }
        public DbSet<Posicion> Posiciones { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Autobus>().ToTable("Autobuses");
            modelBuilder.Entity<Autobus>().HasKey(a => a.Id);

            modelBuilder.Entity<Ruta>().ToTable("Rutas");
            modelBuilder.Entity<Ruta>().HasKey(r => r.Id); // Definir la clave primaria de Ruta

            modelBuilder.Entity<Posicion>().ToTable("Posiciones");
            modelBuilder.Entity<Posicion>()
                .HasKey(p => p.Id); // Clave primaria para Posicion

            modelBuilder.Entity<Posicion>()
                .HasOne(p => p.Autobus)
                .WithMany(a => a.Posiciones)
                .HasForeignKey(p => p.AutobusId)
                .OnDelete(DeleteBehavior.Cascade);
        }



    }
}
