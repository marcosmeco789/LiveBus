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

        // GET: api/PuntosRuta/Ruta/5
        [HttpGet("Ruta/{rutaId}")]
        public async Task<ActionResult<IEnumerable<PuntoRuta>>> GetPuntosPorRuta(int rutaId)
        {
            var puntos = await _context.PuntosRuta
                .Where(pr => pr.RutaId == rutaId)
                .OrderBy(pr => pr.Orden)
                .ToListAsync();

            return puntos;
        }

        // PUT: api/PuntosRuta/5
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
        [HttpPost]
        public async Task<ActionResult<PuntoRuta>> PostPuntoRuta(PuntoRuta puntoRuta)
        {
            _context.PuntosRuta.Add(puntoRuta);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetPuntoRuta", new { id = puntoRuta.Id }, puntoRuta);
        }

        // POST: api/PuntosRuta/Batch
        [HttpPost("varios")]
        public async Task<ActionResult<IEnumerable<PuntoRuta>>> PostPuntosRuta(List<PuntoRuta> puntosRuta)
        {
            if (puntosRuta == null || !puntosRuta.Any())
            {
                return BadRequest("La lista de puntos de ruta no puede estar vacía");
            }

            // Verificar que todas las rutas existen
            var rutaIds = puntosRuta.Select(p => p.RutaId).Distinct().ToList();
            var existingRutas = await _context.Rutas
                .Where(r => rutaIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync();

            if (existingRutas.Count != rutaIds.Count)
            {
                var missingRutas = rutaIds.Except(existingRutas).ToList();
                return BadRequest($"Las siguientes rutas no existen: {string.Join(", ", missingRutas)}");
            }

            // Agregar todos los puntos a la base de datos
            _context.PuntosRuta.AddRange(puntosRuta);
            await _context.SaveChangesAsync();

            // Devolver los puntos creados con sus IDs asignados
            return CreatedAtAction("GetPuntosRuta", puntosRuta);
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

        // DELETE: api/PuntosRuta/Ruta/5
        [HttpDelete("Ruta/{rutaId}")]
        public async Task<IActionResult> DeletePuntosPorRuta(int rutaId)
        {
            var puntos = await _context.PuntosRuta
                .Where(pr => pr.RutaId == rutaId)
                .ToListAsync();

            if (!puntos.Any())
            {
                return NotFound($"No se encontraron puntos para la ruta con ID {rutaId}");
            }

            _context.PuntosRuta.RemoveRange(puntos);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool PuntoRutaExists(int id)
        {
            return _context.PuntosRuta.Any(e => e.Id == id);
        }
    }
}
