using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppOutboxPriority : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Priority",
                table: "WhatsAppOutboxMessages",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "SendFailureReason",
                table: "PhoneVerificationOtps",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SendQueuedAt",
                table: "PhoneVerificationOtps",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SendStatus",
                table: "PhoneVerificationOtps",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SentAt",
                table: "PhoneVerificationOtps",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppOutboxMessages_Status_Priority_NextRetryAt",
                table: "WhatsAppOutboxMessages",
                columns: new[] { "Status", "Priority", "NextRetryAt" },
                filter: "[Status] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WhatsAppOutboxMessages_Status_Priority_NextRetryAt",
                table: "WhatsAppOutboxMessages");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "WhatsAppOutboxMessages");

            migrationBuilder.DropColumn(
                name: "SendFailureReason",
                table: "PhoneVerificationOtps");

            migrationBuilder.DropColumn(
                name: "SendQueuedAt",
                table: "PhoneVerificationOtps");

            migrationBuilder.DropColumn(
                name: "SendStatus",
                table: "PhoneVerificationOtps");

            migrationBuilder.DropColumn(
                name: "SentAt",
                table: "PhoneVerificationOtps");
        }
    }
}
