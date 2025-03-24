using LiveBus.Modelos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiveBus.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AutobusesController : ControllerBase
    {
        private readonly LiveBusContext _context;

        public AutobusesController(LiveBusContext context)
        {
            _context = context;
        }

        // GET: api/Autobuses
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Autobus>>> GetAutobuses()
        {
            return await _context.Autobuses
                .Include(a => a.Ruta)
                    .ThenInclude(r => r.PuntosRuta)
                .ToListAsync();
        }

        // GET: api/Autobuses/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Autobus>> GetAutobus(int id)
        {
            var autobus = await _context.Autobuses
                .Include(a => a.Ruta)
                    .ThenInclude(r => r.PuntosRuta)
                .Include(a => a.Posiciones.OrderByDescending(p => p.Timestamp).Take(1))
                .FirstOrDefaultAsync(a => a.Id == id);

            if (autobus == null)
            {
                return NotFound();
            }

            return autobus;
        }
        // PUT: api/Autobuses/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAutobus(int id, Autobus autobus)
        {
            if (id != autobus.Id)
            {
                return BadRequest();
            }

            _context.Entry(autobus).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AutobusExists(id))
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

        // POST: api/Autobuses
        [HttpPost]
        public async Task<ActionResult<Autobus>> PostAutobus(Autobus autobus)
        {
            _context.Autobuses.Add(autobus);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetAutobus", new { id = autobus.Id }, autobus);
        }

        // DELETE: api/Autobuses/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAutobus(int id)
        {
            var autobus = await _context.Autobuses.FindAsync(id);
            if (autobus == null)
            {
                return NotFound();
            }

            _context.Autobuses.Remove(autobus);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool AutobusExists(int id)
        {
            return _context.Autobuses.Any(e => e.Id == id);
        }
    }
}
