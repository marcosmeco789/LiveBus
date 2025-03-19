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
        public DbSet<PuntoRuta> PuntosRuta { get; set; }  // Nuevo DbSet

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Autobus>().ToTable("Autobuses");
            modelBuilder.Entity<Autobus>().HasKey(a => a.Id);
            modelBuilder.Entity<Autobus>()
                .HasOne(a => a.Ruta)  // Esta es la línea 22 que está causando el error
                .WithMany(r => r.Autobuses)
                .HasForeignKey(a => a.RutaId);


            modelBuilder.Entity<Ruta>().ToTable("Rutas");
            modelBuilder.Entity<Ruta>().HasKey(r => r.Id);

            modelBuilder.Entity<Posicion>().ToTable("Posiciones");
            modelBuilder.Entity<Posicion>().HasKey(p => p.Id);
            modelBuilder.Entity<Posicion>()
                .HasOne(p => p.Autobus)
                .WithMany(a => a.Posiciones)
                .HasForeignKey(p => p.AutobusId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PuntoRuta>().ToTable("PuntosRuta");
            modelBuilder.Entity<PuntoRuta>().HasKey(pr => pr.Id);
            modelBuilder.Entity<PuntoRuta>()
                .HasOne(pr => pr.Ruta)
                .WithMany(r => r.PuntosRuta)
                .HasForeignKey(pr => pr.RutaId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
