using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LiveBus;
using LiveBus.Modelos;

namespace LiveBus.Controladores
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
                .Include(a => a.Posiciones)
                .ToListAsync();
        }

        // GET: api/Autobuses/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Autobus>> GetAutobus(int id)
        {
            var autobus = await _context.Autobuses
                .Include(a => a.Ruta)
                .Include(a => a.Posiciones)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (autobus == null)
            {
                return NotFound();
            }

            return autobus;
        }

        // PUT: api/Autobuses/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
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
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
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
