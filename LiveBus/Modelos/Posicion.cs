namespace LiveBus.Modelos
{
    public class Posicion
    {
        public int Id { get; set; }  // Esta es la clave primaria
        public int AutobusId { get; set; }  // Referencia a la clave foránea
        public double Latitud { get; set; }
        public double Longitud { get; set; }
        public DateTime? Timestamp { get; set; }

        // Navegación a la entidad Autobus
        public Autobus? Autobus { get; set; }
    }
}
