using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// SQL Server cannot ALTER a column to drop the IDENTITY property — the
    /// column must be dropped and recreated. The OrderCounters table is empty
    /// at this point (no successful checkouts yet), so a full table drop is
    /// safe in dev. In production this migration would never be needed because
    /// the corrected M3_2a_Orders ships before any orders exist.
    /// </remarks>
    public partial class M3_2a1_FixOrderCounterIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "OrderCounters");

            migrationBuilder.CreateTable(
                name: "OrderCounters",
                columns: table => new
                {
                    Year = table.Column<int>(type: "int", nullable: false),
                    LastNumber = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<System.DateTimeOffset>(
                        type: "datetimeoffset",
                        nullable: false,
                        defaultValueSql: "SYSUTCDATETIME()"),
                },
                constraints: table => table.PrimaryKey("PK_OrderCounters", x => x.Year));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "OrderCounters");

            migrationBuilder.CreateTable(
                name: "OrderCounters",
                columns: table => new
                {
                    Year = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LastNumber = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<System.DateTimeOffset>(
                        type: "datetimeoffset",
                        nullable: false,
                        defaultValueSql: "SYSUTCDATETIME()"),
                },
                constraints: table => table.PrimaryKey("PK_OrderCounters", x => x.Year));
        }
    }
}
