using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LiveBus.Migrations
{
    /// <inheritdoc />
    public partial class AgregadoPuntoRuta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RutaId",
                table: "Autobuses",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PuntosRuta",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RutaId = table.Column<int>(type: "int", nullable: false),
                    Orden = table.Column<int>(type: "int", nullable: false),
                    Latitud = table.Column<double>(type: "float", nullable: false),
                    Longitud = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PuntosRuta", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PuntosRuta_Rutas_RutaId",
                        column: x => x.RutaId,
                        principalTable: "Rutas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Autobuses_RutaId",
                table: "Autobuses",
                column: "RutaId");

            migrationBuilder.CreateIndex(
                name: "IX_PuntosRuta_RutaId",
                table: "PuntosRuta",
                column: "RutaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Autobuses_Rutas_RutaId",
                table: "Autobuses",
                column: "RutaId",
                principalTable: "Rutas",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Autobuses_Rutas_RutaId",
                table: "Autobuses");

            migrationBuilder.DropTable(
                name: "PuntosRuta");

            migrationBuilder.DropIndex(
                name: "IX_Autobuses_RutaId",
                table: "Autobuses");

            migrationBuilder.DropColumn(
                name: "RutaId",
                table: "Autobuses");
        }
    }
}
