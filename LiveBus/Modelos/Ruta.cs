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
        public required string Descripcion { get; set; }  
        public bool Habilitada { get; set; } = true;      


        public ICollection<PuntoRuta> PuntosRuta { get; set; }
        public ICollection<Autobus> Autobuses { get; set; }
    }
}
