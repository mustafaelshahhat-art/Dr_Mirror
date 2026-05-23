using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class M10_AdminAuditNote : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "AdminAuditLogEntries",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Note",
                table: "AdminAuditLogEntries");
        }
    }
}
