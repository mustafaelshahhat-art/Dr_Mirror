using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class M8_EmailOutboxLease : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LockedAt",
                table: "EmailOutboxMessages",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LockedBy",
                table: "EmailOutboxMessages",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmailOutboxMessages_Status_LockedAt",
                table: "EmailOutboxMessages",
                columns: new[] { "Status", "LockedAt" },
                filter: "[Status] = 3");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EmailOutboxMessages_Status_LockedAt",
                table: "EmailOutboxMessages");

            migrationBuilder.DropColumn(
                name: "LockedAt",
                table: "EmailOutboxMessages");

            migrationBuilder.DropColumn(
                name: "LockedBy",
                table: "EmailOutboxMessages");
        }
    }
}
