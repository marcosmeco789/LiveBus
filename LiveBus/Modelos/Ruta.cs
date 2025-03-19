namespace LiveBus.Modelos
{
    public class Ruta
    {
        public Ruta()
        {
            PuntosRuta = new List<PuntoRuta>();
            Autobuses = new List<Autobus>();
        }

        public int Id { get; set; }
        public required string Descripcion { get; set; }  // Usar el modificador required

        // Propiedades de navegación
        public ICollection<PuntoRuta> PuntosRuta { get; set; }
        public ICollection<Autobus> Autobuses { get; set; }
    }
}
