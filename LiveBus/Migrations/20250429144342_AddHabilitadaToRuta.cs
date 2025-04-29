using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LiveBus.Migrations
{
    /// <inheritdoc />
    public partial class AddHabilitadaToRuta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Habilitada",
                table: "Rutas",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Habilitada",
                table: "Rutas");
        }
    }
}
