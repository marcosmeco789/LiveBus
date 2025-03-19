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
    public class PuntosRutaController : ControllerBase
    {
        private readonly LiveBusContext _context;

        public PuntosRutaController(LiveBusContext context)
        {
            _context = context;
        }

        // GET: api/PuntosRuta
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PuntoRuta>>> GetPuntosRuta()
        {
            return await _context.PuntosRuta
                .Include(pr => pr.Ruta)
                .ToListAsync();
        }

        // GET: api/PuntosRuta/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PuntoRuta>> GetPuntoRuta(int id)
        {
            var puntoRuta = await _context.PuntosRuta
                .Include(pr => pr.Ruta)
                .FirstOrDefaultAsync(pr => pr.Id == id);

            if (puntoRuta == null)
            {
                return NotFound();
            }

            return puntoRuta;
        }


        // PUT: api/PuntosRuta/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutPuntoRuta(int id, PuntoRuta puntoRuta)
        {
            if (id != puntoRuta.Id)
            {
                return BadRequest();
            }

            _context.Entry(puntoRuta).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PuntoRutaExists(id))
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

        // POST: api/PuntosRuta
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<PuntoRuta>> PostPuntoRuta(PuntoRuta puntoRuta)
        {
            _context.PuntosRuta.Add(puntoRuta);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetPuntoRuta", new { id = puntoRuta.Id }, puntoRuta);
        }

        // DELETE: api/PuntosRuta/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePuntoRuta(int id)
        {
            var puntoRuta = await _context.PuntosRuta.FindAsync(id);
            if (puntoRuta == null)
            {
                return NotFound();
            }

            _context.PuntosRuta.Remove(puntoRuta);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool PuntoRutaExists(int id)
        {
            return _context.PuntosRuta.Any(e => e.Id == id);
        }
    }
}

