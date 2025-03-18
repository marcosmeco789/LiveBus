namespace LiveBus.Modelos
{
    public class Autobus
    {
        public int Id { get; set; }  // Debe tener la propiedad 'Id' como clave primaria
        public string? Nombre { get; set; }
        public string? Estado { get; set; }

        // Navegación a las posiciones
        public ICollection<Posicion> Posiciones { get; set; }
    }
}
