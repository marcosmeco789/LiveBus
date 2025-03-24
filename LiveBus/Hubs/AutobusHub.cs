using LiveBus.Modelos;
using Microsoft.AspNetCore.SignalR;

namespace LiveBus.Hubs
{
    public class AutobusHub : Hub
    {
        public async Task EnviarActualizacionPosicion(int autobusId, double latitud, double longitud)
        {
            await Clients.All.SendAsync("RecibirActualizacionPosicion", autobusId, latitud, longitud);
        }

        public async Task EnviarInfoAutobus(Autobus autobus)
        {
            await Clients.All.SendAsync("RecibirInfoAutobus", autobus);
        }

        public async Task NotificarCambioRuta(int autobusId, int rutaId)
        {
            await Clients.All.SendAsync("RecibirCambioRuta", autobusId, rutaId);
        }

        public async Task NotificarInicioSimulacion()
        {
            await Clients.All.SendAsync("SimulacionIniciada");
        }

        public async Task NotificarPausaSimulacion()
        {
            await Clients.All.SendAsync("SimulacionPausada");
        }

        public async Task NotificarReinicioSimulacion()
        {
            await Clients.All.SendAsync("SimulacionReiniciada");
        }
    }
}
