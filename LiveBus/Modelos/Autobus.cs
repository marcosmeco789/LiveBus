namespace LiveBus.Modelos
{
    public class Autobus
    {
        public Autobus()
        {
            Posiciones = new List<Posicion>();
        }

        public int Id { get; set; }
        public string? Nombre { get; set; }
        public string? Estado { get; set; }
        public int? RutaId { get; set; }  // Relación con la ruta que sigue

        // Propiedades de navegación
        public Ruta? Ruta { get; set; }
        public ICollection<Posicion> Posiciones { get; set; }
    }
}
