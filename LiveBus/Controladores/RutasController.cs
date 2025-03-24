using LiveBus.Modelos;
using Microsoft.AspNetCore.Mvc;
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
            return await _context.Rutas
                .Include(r => r.PuntosRuta)
                .ToListAsync();
        }

        // GET: api/Rutas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Ruta>> GetRuta(int id)
        {
            var ruta = await _context.Rutas
                .Include(r => r.PuntosRuta)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (ruta == null)
            {
                return NotFound();
            }

            return ruta;
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
            var ruta = await _context.Rutas.FindAsync(id);
            if (ruta == null)
            {
                return NotFound();
            }

            _context.Rutas.Remove(ruta);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool RutaExists(int id)
        {
            return _context.Rutas.Any(e => e.Id == id);
        }
    }
}