using LiveBus.Hubs;
using LiveBus.Modelos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace LiveBus.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RutasController : ControllerBase
    {
        private readonly LiveBusContext _context;

        public RutasController(LiveBusContext context)
        {
            _context = context;
        }

        // GET: api/Rutas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Ruta>>> GetRutas()
        {
            // Modificar para filtrar solo rutas habilitadas
            return await _context.Rutas
                .Include(r => r.PuntosRuta)
                .Where(r => r.Habilitada)  // Filtrar solo rutas habilitadas
                .ToListAsync();
        }

        // GET: api/Rutas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Ruta>> GetRuta(int id)
        {
            var ruta = await _context.Rutas
                .Include(r => r.PuntosRuta.OrderBy(p => p.Orden))
                .Include(r => r.Autobuses)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (ruta == null || !ruta.Habilitada) // Añadir verificación si la ruta está habilitada
            {
                return NotFound();
            }

            return ruta;
        }

        // GET: api/Rutas/admin/all
        [HttpGet("admin/all")]
        public async Task<ActionResult<IEnumerable<Ruta>>> GetAllRutas()
        {
            return await _context.Rutas
                .Include(r => r.PuntosRuta)
                .ToListAsync();
        }


        // PUT: api/Rutas/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutRuta(int id, Ruta ruta)
        {
            if (id != ruta.Id)
            {
                return BadRequest();
            }

            _context.Entry(ruta).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!RutaExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Rutas
        [HttpPost]
        public async Task<ActionResult<Ruta>> PostRuta(Ruta ruta)
        {
            _context.Rutas.Add(ruta);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetRuta", new { id = ruta.Id }, ruta);
        }

        // DELETE: api/Rutas/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRuta(int id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var ruta = await _context.Rutas
                    .Include(r => r.Autobuses)
                    .Include(r => r.PuntosRuta)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (ruta == null)
                {
                    return NotFound();
                }

                foreach (var autobus in ruta.Autobuses.ToList())
                {
                    autobus.RutaId = null;
                    autobus.PuntoActual = 0;
                    _context.Entry(autobus).State = EntityState.Modified;
                }

                if (ruta.PuntosRuta != null && ruta.PuntosRuta.Any())
                {
                    _context.PuntosRuta.RemoveRange(ruta.PuntosRuta);
                }

                _context.Rutas.Remove(ruta);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                // Rollback en caso de error
                await transaction.RollbackAsync();
                return StatusCode(500, ex.InnerException?.Message ?? ex.Message);
            }
        }


        [HttpPost("{id}/actualizarEstadoVisibilidad")]
        public async Task<IActionResult> ActualizarEstadoVisibilidad(int id)
        {
            var ruta = await _context.Rutas
                .Include(r => r.Autobuses)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (ruta == null)
            {
                return NotFound();
            }

            // Notificar a los clientes del cambio en la visibilidad de la ruta
            var hubContext = HttpContext.RequestServices.GetRequiredService<IHubContext<AutobusHub>>();
            await hubContext.Clients.All.SendAsync("ActualizarEstadoRuta", id, ruta.Habilitada);

            return Ok();
        }

        private bool RutaExists(int id)
        {
            return _context.Rutas.Any(e => e.Id == id);
        }
    }
}