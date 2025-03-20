using Microsoft.AspNetCore.Mvc;
using LiveBus.Servicios;

namespace LiveBus.Controladores
{
    [Route("api/[controller]")]
    [ApiController]
    public class SimulacionController : ControllerBase
    {
        private readonly Simulacion _simulacion;

        public SimulacionController(Simulacion simulacion)
        {
            _simulacion = simulacion;
        }

        [HttpPost("iniciar/{autobusId}")]
        public async Task<IActionResult> IniciarSimulacion(int autobusId)
        {
            await _simulacion.IniciarSimulacion(autobusId);
            return Ok();
        }

        [HttpPost("detener/{autobusId}")]
        public IActionResult DetenerSimulacion(int autobusId)
        {
            _simulacion.DetenerSimulacion(autobusId);
            return Ok();
        }
    }
}
