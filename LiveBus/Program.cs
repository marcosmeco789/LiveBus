using LiveBus;
using LiveBus.Components;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

// Configurar Entity Framework Core con SQL Server
var connectionString = builder.Configuration.GetConnectionString("LiveBusDB");
builder.Services.AddDbContext<LiveBusContext>(options =>
    options.UseSqlServer(connectionString));

// Agregar controladores para la API
// Agregar controladores para la API con opciones de JSON
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.Preserve;
    options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
});

// Configurar Razor Components
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Configurar logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

var app = builder.Build();

// Configurar el pipeline HTTP
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAntiforgery();

// Mapear controladores
app.MapControllers();

// Mapear componentes de Blazor
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
