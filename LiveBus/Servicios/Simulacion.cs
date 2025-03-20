using LiveBus.Modelos;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using LiveBus.Hubs;

namespace LiveBus.Servicios
{
    public class Simulacion
    {
        private readonly LiveBusContext _context;
        private readonly IHubContext<MapaHub> _hubContext;
        private readonly Dictionary<int, Task> _simulaciones; // Para manejar múltiples autobuses en movimiento

        public Simulacion(LiveBusContext context, IHubContext<MapaHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
            _simulaciones = new Dictionary<int, Task>();
        }

        public async Task IniciarSimulacion(int autobusId)
        {
            var autobus = await _context.Autobuses.Include(a => a.Ruta)
                                                  .FirstOrDefaultAsync(a => a.Id == autobusId);
            if (autobus == null || autobus.RutaId == null)
                return;

            var puntosRuta = await _context.PuntosRuta
                                           .Where(p => p.RutaId == autobus.RutaId)
                                           .OrderBy(p => p.Orden)
                                           .ToListAsync();

            if (puntosRuta.Count == 0) return;

            if (_simulaciones.ContainsKey(autobusId))
                return; // Ya está en movimiento

            _simulaciones[autobusId] = Task.Run(async () =>
            {
                while (true)
                {
                    autobus.PuntoActual = (autobus.PuntoActual + 1) % puntosRuta.Count;
                    var nuevoPunto = puntosRuta[autobus.PuntoActual];

                    // Aquí actualizamos la base de datos
                    autobus.RutaId = nuevoPunto.RutaId;
                    await _context.SaveChangesAsync();

                    // Enviar la nueva posición a través de SignalR
                    await _hubContext.Clients.All.SendAsync("RecibirPosicion", autobus.Id, nuevoPunto.Latitud, nuevoPunto.Longitud);

                    // Esperamos unos segundos antes del próximo movimiento
                    await Task.Delay(3000); // Se mueve cada 3 segundos (ajustable)
                }
            });
        }

        public void DetenerSimulacion(int autobusId)
        {
            if (_simulaciones.ContainsKey(autobusId))
            {
                _simulaciones.Remove(autobusId);
            }
        }
    }
}
