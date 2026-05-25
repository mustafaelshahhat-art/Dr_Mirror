using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppOutboxBuyerUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WhatsAppOutboxMessages_RecipientPhoneMasked_CreatedAt",
                table: "WhatsAppOutboxMessages");

            migrationBuilder.AddColumn<Guid>(
                name: "BuyerUserId",
                table: "WhatsAppOutboxMessages",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppOutboxMessages_BuyerUserId_CreatedAt",
                table: "WhatsAppOutboxMessages",
                columns: new[] { "BuyerUserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WhatsAppOutboxMessages_BuyerUserId_CreatedAt",
                table: "WhatsAppOutboxMessages");

            migrationBuilder.DropColumn(
                name: "BuyerUserId",
                table: "WhatsAppOutboxMessages");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppOutboxMessages_RecipientPhoneMasked_CreatedAt",
                table: "WhatsAppOutboxMessages",
                columns: new[] { "RecipientPhoneMasked", "CreatedAt" });
        }
    }
}
