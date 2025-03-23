# LiveBus

## Bitácora de Desarrollo

### 18/03/2025

- Instalé todo lo necesario.
- Creé la base de datos y realicé las migraciones.
- Vi un video en YouTube para entender un poco Blazor, aunque aún no lo usaré ya que primero me encargaré del backend.

    [Video de YouTube](https://www.youtube.com/watch?v=VDkiB5F7FH0)

&nbsp;
--- 
&nbsp;

### 19/03/2025

- Empecé viendo un video que explica conceptos básicos de ASP.NET 

    [Video](https://www.youtube.com/watch?v=Gua0O0Q7I58) 


- Después vi otro video para aprender a crear APIs con esta tecnología 

    [Video](https://www.youtube.com/watch?v=IhzQUI6XHPw)

&nbsp;
- Luego, me puse a crear la API del proyecto y me di cuenta de que tenía que cambiar el diseño de las tablas de mi base de datos. Añadí una tabla adicional y, después de modificar los modelos, intenté hacer la migración, pero me daba error constantemente. Al final, después de un buen rato, probé a cerrar y volver a abrir el IDE y se solucionó.

- Lo siguiente que hice fue crear los Controladores usando Scaffolding, que automatiza la creación de los endpoints. Tuve que modificar el código generado para que se ajuste a las relaciones que tengo entre tablas.

- Finalmente, descargué PostMan y configuré mi entorno de trabajo. 

&nbsp;

![PostMan Configuration](./Recursos/PostMan1.png)

---


### 20/03/2025

- Agregué las dependencias para Leaflet y SignalR.
- Modifiqué la tabla autobuses con un nuevo campo, PuntoActual.
- Creé un nuevo controlador para manejar las simulaciones y un hub de SignalR para enviar actualizaciones a los clientes.
- A modo de debug provisional, intenté hacer una página con un mapa para ir probando simulaciones, pero no he conseguido que aparezca el mapa.
- Para intentar que el mapa apareciese, probé a usar Leaflet con JavaScript y C#, pero no sirvió.

---

### 22/03/2025 - 23/03/2025

- Estos dos días intenté hacer que apareciese el mapa en /autobuses pero me encontré con los siguientes problemas:
  - Estaba haciendo el proyecto con una configuración errónea, es una web Blazor Server, no Blazor WebAssembly. Tuve que cambiar esto en **App.razor**
    
    ```html
    <script src="_framework/blazor.web.js"></script>  -->  <script src="_framework/blazor.server.js"></script>
    ```
  - El cliente al conectarse a la web era desconectado al instante, un problema difícil de ver ya que solo avisaba por la consola del navegador. Lo descubrí mientras arreglaba un fallo.
    - Para solucionar este error tuve que volver a un commit anterior del proyecto, ya que no era capaz de encontrar el error. Después de ir archivo por archivo descubrí que era producido por SignalR, tecnología que usaré más adelante para actualizar el mapa en tiempo real. De momento, la he quitado, lo solucionaré más adelante.
  - Haciendo pruebas en /autobuses me di cuenta de que el JavaScript no se ejecutaba. Puse puntos de depuración y no lanzaba la función que tenía adjunta al onClick del botón, el fallo resultó ser que para que un archivo razor detecte el onClick del botón necesita este parámetro al inicio del archivo:
    ```ruby
        @rendermode InteractiveServer
    ```

  
- Actualmente, en /autobuses el mapa carga una ubicación.