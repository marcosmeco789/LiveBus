using Microsoft.AspNetCore.SignalR;

namespace LiveBus.Hubs
{
    public class MapaHub : Hub
    {
        public async Task EnviarPosicion(int autobusId, double latitud, double longitud)
        {
            await Clients.All.SendAsync("RecibirPosicion", autobusId, latitud, longitud);
        }
    }
}
