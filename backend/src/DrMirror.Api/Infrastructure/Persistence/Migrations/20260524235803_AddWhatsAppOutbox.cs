using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CustomerNotificationPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WhatsAppEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerNotificationPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomerNotificationPreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WhatsAppOutboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RecipientPhoneMasked = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    Attempts = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    NextRetryAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastAttemptAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeliveredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    FailureReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsAppOutboxMessages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "UX_CustomerNotificationPreferences_UserId",
                table: "CustomerNotificationPreferences",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppOutboxMessages_RecipientPhoneMasked_CreatedAt",
                table: "WhatsAppOutboxMessages",
                columns: new[] { "RecipientPhoneMasked", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppOutboxMessages_Status_LockedAt",
                table: "WhatsAppOutboxMessages",
                columns: new[] { "Status", "LockedAt" },
                filter: "[Status] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppOutboxMessages_Status_NextRetryAt",
                table: "WhatsAppOutboxMessages",
                columns: new[] { "Status", "NextRetryAt" },
                filter: "[Status] = 0");

            migrationBuilder.CreateIndex(
                name: "UX_WhatsAppOutboxMessages_IdempotencyKey",
                table: "WhatsAppOutboxMessages",
                column: "IdempotencyKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomerNotificationPreferences");

            migrationBuilder.DropTable(
                name: "WhatsAppOutboxMessages");
        }
    }
}
