namespace LiveBus.Modelos
{
    public class PuntoRuta
    {
        public int Id { get; set; }
        public int RutaId { get; set; }  // Clave foránea que referencia a la Ruta
        public int Orden { get; set; }   // Para saber en qué orden se recorren los puntos
        public double Latitud { get; set; }
        public double Longitud { get; set; }

        // Propiedad de navegación
        public Ruta? Ruta { get; set; }
    }
}