using LiveBus.Hubs;
using LiveBus.Modelos;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace LiveBus.Servicios
{
    public interface ISimulacionService : IHostedService
    {
        Task IniciarSimulacion();
        Task PausarSimulacion();
        Task ReiniciarSimulacion();
        Task<IEnumerable<Autobus>> ObtenerAutobusesActivos();
        Task AsignarRutaAutobus(int autobusId, int rutaId);

        Task IniciarSimulacionPorRuta(int rutaId);
        Task PausarSimulacionPorRuta(int rutaId);
        Task ReiniciarSimulacionPorRuta(int rutaId);
    }

    public class SimulacionService : BackgroundService, ISimulacionService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<AutobusHub> _hubContext;
        private readonly ILogger<SimulacionService> _logger;
        private readonly ConcurrentDictionary<int, Autobus> _autobusesActivos = new();
        private Timer? _timer;
        private bool _simulacionActiva = false;
        private readonly object _lock = new();
        private readonly TimeSpan _intervaloActualizacion = TimeSpan.FromSeconds(3);

        public SimulacionService(
            IServiceScopeFactory scopeFactory,
            IHubContext<AutobusHub> hubContext,
            ILogger<SimulacionService> logger)
        {
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Servicio de Simulacion iniciado");

            await CargarDatosIniciales();

            _timer = new Timer(ActualizarPosiciones, null, Timeout.Infinite, Timeout.Infinite);

            await Task.CompletedTask;
        }

        private async Task CargarDatosIniciales()
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<LiveBusContext>();
                var autobuses = await context.Autobuses
                    .Include(a => a.Ruta)
                    .ThenInclude(r => r.PuntosRuta)
                    .ToListAsync();

                foreach (var autobus in autobuses)
                {
                    if (autobus.Ruta != null && autobus.Ruta.PuntosRuta != null && autobus.Ruta.PuntosRuta.Any())
                    {
                        _autobusesActivos.TryAdd(autobus.Id, autobus);
                    }
                }

                _logger.LogInformation($"Datos iniciales cargados: {_autobusesActivos.Count} autobuses activos.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al cargar datos iniciales.");
            }
        }

        private async void ActualizarPosiciones(object? state)
        {
            if (!_simulacionActiva)
                return;

            try
            {
                var zonaHorariaEspana = TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time");

                foreach (var autobus in _autobusesActivos.Values)
                {
                    // Solo procesar autobuses de rutas activas
                    if (autobus.RutaId.HasValue && !_rutasActivas.GetValueOrDefault(autobus.RutaId.Value, false))
                        continue;

                    if (autobus.Ruta == null || autobus.Ruta.PuntosRuta == null || !autobus.Ruta.PuntosRuta.Any())
                        continue;

                    var puntosRuta = autobus.Ruta.PuntosRuta.OrderBy(p => p.Orden).ToList();

                    if (puntosRuta.Count <= 1 || autobus.PuntoActual >= puntosRuta.Count)
                    {
                        autobus.PuntoActual = 0;
                    }

                    var puntoActual = puntosRuta[autobus.PuntoActual];
                    var siguientePunto = puntosRuta[(autobus.PuntoActual + 1) % puntosRuta.Count];

                    var timestampUtc = DateTime.UtcNow;
                    var timestampEspana = TimeZoneInfo.ConvertTimeFromUtc(timestampUtc, zonaHorariaEspana);

                    var posicion = new Posicion
                    {
                        AutobusId = autobus.Id,
                        Latitud = puntoActual.Latitud,
                        Longitud = puntoActual.Longitud,
                        Timestamp = timestampEspana
                    };

                    autobus.PuntoActual = (autobus.PuntoActual + 1) % puntosRuta.Count;

                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LiveBusContext>();
                        context.Posiciones.Add(posicion);

                        var autobusDb = await context.Autobuses.FindAsync(autobus.Id);
                        if (autobusDb != null)
                        {
                            autobusDb.PuntoActual = autobus.PuntoActual;
                            context.Entry(autobusDb).State = EntityState.Modified;
                        }

                        await context.SaveChangesAsync();
                    }

                    await _hubContext.Clients.All.SendAsync("RecibirActualizacionPosicion",
                        autobus.Id, posicion.Latitud, posicion.Longitud);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar posiciones de autobuses.");
            }
            finally
            {
                if (_simulacionActiva && _timer != null)
                {
                    _timer.Change(_intervaloActualizacion, Timeout.InfiniteTimeSpan);
                }
            }
        }


        private readonly ConcurrentDictionary<int, bool> _rutasActivas = new(); // Estado por ruta

        public async Task IniciarSimulacionPorRuta(int rutaId)
        {
            // Marcar esta ruta específica como activa
            _rutasActivas[rutaId] = true;

            // Iniciar el timer global si está parado
            lock (_lock)
            {
                if (!_simulacionActiva)
                {
                    _simulacionActiva = true;
                    _timer?.Change(TimeSpan.Zero, Timeout.InfiniteTimeSpan);
                }
            }

            _logger.LogInformation($"Simulación iniciada para la ruta {rutaId}");

            // Notificar solo a los clientes interesados en esta ruta
            await _hubContext.Clients.All.SendAsync("SimulacionIniciadaRuta", rutaId);
        }

        public async Task PausarSimulacionPorRuta(int rutaId)
        {
            // Marcar esta ruta específica como inactiva
            _rutasActivas[rutaId] = false;

            // Verificar si hay alguna ruta activa
            bool hayRutasActivas = _rutasActivas.Values.Any(activa => activa);

            // Si no hay rutas activas, pausar el timer global
            if (!hayRutasActivas)
            {
                lock (_lock)
                {
                    _simulacionActiva = false;
                    _timer?.Change(Timeout.Infinite, Timeout.Infinite);
                }
            }

            _logger.LogInformation($"Simulación pausada para la ruta {rutaId}");

            // Notificar solo a los clientes interesados en esta ruta
            await _hubContext.Clients.All.SendAsync("SimulacionPausadaRuta", rutaId);
        }

        public async Task ReiniciarSimulacionPorRuta(int rutaId)
        {
            // Reiniciar solo los autobuses de esta ruta específica
            var autobusesEnRuta = _autobusesActivos.Values.Where(a => a.RutaId == rutaId);
            foreach (var autobus in autobusesEnRuta)
            {
                autobus.PuntoActual = 0;
            }

            // Marcar esta ruta como activa
            _rutasActivas[rutaId] = true;

            // Asegurar que el timer está en marcha
            lock (_lock)
            {
                if (!_simulacionActiva)
                {
                    _simulacionActiva = true;
                    _timer?.Change(TimeSpan.Zero, Timeout.InfiniteTimeSpan);
                }
            }

            _logger.LogInformation($"Simulación reiniciada para la ruta {rutaId}");

            // Notificar solo a los clientes interesados en esta ruta
            await _hubContext.Clients.All.SendAsync("SimulacionReiniciadaRuta", rutaId);
        }



        public async Task IniciarSimulacion()
        {
            lock (_lock)
            {
                if (!_simulacionActiva)
                {
                    _simulacionActiva = true;
                    _timer?.Change(TimeSpan.Zero, Timeout.InfiniteTimeSpan);
                    _logger.LogInformation("Simulación iniciada para todas las rutas habilitadas.");
                }
            }

            await _hubContext.Clients.All.SendAsync("SimulacionIniciada");
        }

        public async Task PausarSimulacion()
        {
            lock (_lock)
            {
                if (_simulacionActiva)
                {
                    _simulacionActiva = false;
                    _timer?.Change(Timeout.Infinite, Timeout.Infinite);
                    _logger.LogInformation("Simulación pausada para todas las rutas habilitadas.");
                }
            }

            await _hubContext.Clients.All.SendAsync("SimulacionPausada");
        }

        public async Task ReiniciarSimulacion()
        {
            foreach (var autobus in _autobusesActivos.Values)
            {
                autobus.PuntoActual = 0;
            }

            await PausarSimulacion();
            await IniciarSimulacion();

            _logger.LogInformation("Simulación reiniciada para todas las rutas habilitadas.");
            await _hubContext.Clients.All.SendAsync("SimulacionReiniciada");
        }




        public async Task<IEnumerable<Autobus>> ObtenerAutobusesActivos()
        {
            return await Task.FromResult(_autobusesActivos.Values);
        }

        public async Task AsignarRutaAutobus(int autobusId, int rutaId)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<LiveBusContext>();

                var autobus = await context.Autobuses.FindAsync(autobusId);
                if (autobus != null)
                {
                    autobus.RutaId = rutaId;
                    autobus.PuntoActual = 0;
                    context.Entry(autobus).State = EntityState.Modified;
                    await context.SaveChangesAsync();

                    var autobusActualizado = await context.Autobuses
                        .Include(a => a.Ruta)
                            .ThenInclude(r => r.PuntosRuta.OrderBy(p => p.Orden))
                        .FirstOrDefaultAsync(a => a.Id == autobusId);

                    if (autobusActualizado != null && autobusActualizado.Ruta != null)
                    {
                        _autobusesActivos.AddOrUpdate(autobusId, autobusActualizado, (_, _) => autobusActualizado);
                    }

                    await _hubContext.Clients.All.SendAsync("RecibirCambioRuta", autobusId, rutaId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error al asignar ruta {rutaId} al autobus {autobusId}");
                throw;
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _timer?.Change(Timeout.Infinite, Timeout.Infinite);
            await base.StopAsync(cancellationToken);
            _logger.LogInformation("Servicio de Simulacion detenido");
        }

        public override void Dispose()
        {
            _timer?.Dispose();
            base.Dispose();
        }
    }
}
