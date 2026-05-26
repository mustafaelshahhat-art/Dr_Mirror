using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppRetryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "EntityId",
                table: "WhatsAppOutboxMessages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EntityType",
                table: "WhatsAppOutboxMessages",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentMessageId",
                table: "WhatsAppOutboxMessages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppOutboxMessages_ParentMessageId",
                table: "WhatsAppOutboxMessages",
                column: "ParentMessageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WhatsAppOutboxMessages_ParentMessageId",
                table: "WhatsAppOutboxMessages");

            migrationBuilder.DropColumn(
                name: "EntityId",
                table: "WhatsAppOutboxMessages");

            migrationBuilder.DropColumn(
                name: "EntityType",
                table: "WhatsAppOutboxMessages");

            migrationBuilder.DropColumn(
                name: "ParentMessageId",
                table: "WhatsAppOutboxMessages");
        }
    }
}
