using LiveBus.Servicios;
using Microsoft.AspNetCore.Mvc;

namespace LiveBus.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SimulacionController : ControllerBase
    {
        private readonly ISimulacionService _simulacionService;

        public SimulacionController(ISimulacionService simulacionService)
        {
            _simulacionService = simulacionService;
        }

        [HttpPost("iniciar")]
        public async Task<IActionResult> Iniciar()
        {
            await _simulacionService.IniciarSimulacion();
            return Ok();
        }

        [HttpPost("pausar")]
        public async Task<IActionResult> Pausar()
        {
            await _simulacionService.PausarSimulacion();
            return Ok();
        }

        [HttpPost("reiniciar")]
        public async Task<IActionResult> Reiniciar()
        {
            await _simulacionService.ReiniciarSimulacion();
            return Ok();
        }
    }
}
