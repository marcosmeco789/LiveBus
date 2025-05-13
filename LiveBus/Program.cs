using LiveBus;
using LiveBus.Components;
using LiveBus.Hubs;
using LiveBus.Servicios;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// configuración de Blazor Server para evitar cierre inesperado
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddServerSideBlazor()
    .AddCircuitOptions(options =>
    {
        options.DetailedErrors = true;  // Para ver errores detallados
        options.DisconnectedCircuitRetentionPeriod = TimeSpan.FromMinutes(10); // Aumentar el tiempo de retención a 10 minutos
        options.JSInteropDefaultCallTimeout = TimeSpan.FromSeconds(30); // Aumentar el timeout en llamadas JS a 30 segundos
    });

// Registrar y configurar el DbContext
builder.Services.AddDbContext<LiveBusContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("LiveBusDB")));

// servicios de SignalR
builder.Services.AddSignalR();

// Configurar controladores para la API con opciones para manejar referencias circulares
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve;
        options.JsonSerializerOptions.WriteIndented = true; // Opcional: para una salida JSON más legible
    });

// Registrar el servicio de simulación como un servicio hosteado (singleton)
builder.Services.AddSingleton<ISimulacionService, SimulacionService>();
builder.Services.AddHostedService(provider => provider.GetRequiredService<ISimulacionService>());




builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxConcurrentConnections = 100;
    serverOptions.Limits.MaxConcurrentUpgradedConnections = 100;
    serverOptions.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
    serverOptions.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(1);

    serverOptions.ListenAnyIP(7030, listenOptions => {
        listenOptions.UseHttps(); 
    });
});

builder.Services.AddHttpClient("LocalAPI", client =>
{
    client.BaseAddress = new Uri("https://localhost:7030/");
});

builder.Services.AddHttpClient("ExternalAPI", client =>
{
    client.BaseAddress = new Uri("https://livebus.ddns.net:7030/");
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAntiforgery();

// Mapear el Hub de SignalR
app.MapHub<AutobusHub>("/autobusMoveHub");

// Mapear los controladores de la API
app.MapControllers();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
