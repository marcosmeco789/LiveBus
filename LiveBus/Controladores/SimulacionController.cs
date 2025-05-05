using LiveBus.Servicios;
using Microsoft.AspNetCore.Mvc;

namespace LiveBus.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SimulacionController : ControllerBase
    {
        private readonly ISimulacionService _simulacionService;

        public SimulacionController(ISimulacionService simulacionService)
        {
            _simulacionService = simulacionService;
        }

        [HttpPost("iniciar")]
        public async Task<IActionResult> IniciarSimulacion([FromQuery] int? rutaId)
        {
            if (rutaId.HasValue)
            {
                await _simulacionService.IniciarSimulacionPorRuta(rutaId.Value);
            }
            else
            {
                await _simulacionService.IniciarSimulacion();
            }
            return Ok();
        }

        [HttpPost("pausar")]
        public async Task<IActionResult> PausarSimulacion([FromQuery] int? rutaId)
        {
            if (rutaId.HasValue)
            {
                await _simulacionService.PausarSimulacionPorRuta(rutaId.Value);
            }
            else
            {
                await _simulacionService.PausarSimulacion();
            }
            return Ok();
        }

        [HttpPost("reiniciar")]
        public async Task<IActionResult> ReiniciarSimulacion([FromQuery] int? rutaId)
        {
            if (rutaId.HasValue)
            {
                await _simulacionService.ReiniciarSimulacionPorRuta(rutaId.Value);
            }
            else
            {
                await _simulacionService.ReiniciarSimulacion();
            }
            return Ok();
        }
    }
}
