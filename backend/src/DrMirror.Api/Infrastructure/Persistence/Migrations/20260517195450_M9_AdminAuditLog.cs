using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class M9_AdminAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "FilePurgedAtUtc",
                table: "PaymentProofs",
                type: "datetimeoffset(7)",
                precision: 7,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AdminAuditLogEntries",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TargetEntityType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TargetEntityId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PreviousStatus = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    NewStatus = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    CorrelationId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    TimestampUtc = table.Column<DateTimeOffset>(type: "datetimeoffset(7)", precision: 7, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminAuditLogEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AdminAuditLogEntries_Users_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderIdempotencyKeys",
                columns: table => new
                {
                    Key = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderIdempotencyKeys", x => x.Key);
                    table.ForeignKey(
                        name: "FK_OrderIdempotencyKeys_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderIdempotencyKeys_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Product_CategoryId_IsActive_CreatedAtUtc",
                table: "Products",
                columns: new[] { "CategoryId", "IsPublished", "CreatedAt" },
                descending: new[] { false, false, true });

            migrationBuilder.CreateIndex(
                name: "IX_Order_Status_CreatedAtUtc",
                table: "Orders",
                columns: new[] { "Status", "CreatedAt" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_Order_StatusTerminal_UpdatedAt",
                table: "Orders",
                columns: new[] { "Status", "UpdatedAt" },
                filter: "[Status] IN (6, 99)");

            migrationBuilder.CreateIndex(
                name: "IX_Order_UserId_CreatedAtUtc",
                table: "Orders",
                columns: new[] { "BuyerUserId", "CreatedAt" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_AdminAudit_Actor",
                table: "AdminAuditLogEntries",
                columns: new[] { "ActorUserId", "TimestampUtc" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_AdminAudit_Target",
                table: "AdminAuditLogEntries",
                columns: new[] { "TargetEntityType", "TargetEntityId", "TimestampUtc" },
                descending: new[] { false, false, true });

            migrationBuilder.CreateIndex(
                name: "IX_AdminAudit_TimestampUtc",
                table: "AdminAuditLogEntries",
                column: "TimestampUtc",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_OrderIdempotencyKeys_OrderId",
                table: "OrderIdempotencyKeys",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderIdempotencyKeys_UserId_CreatedAt",
                table: "OrderIdempotencyKeys",
                columns: new[] { "UserId", "CreatedAtUtc" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdminAuditLogEntries");

            migrationBuilder.DropTable(
                name: "OrderIdempotencyKeys");

            migrationBuilder.DropIndex(
                name: "IX_Product_CategoryId_IsActive_CreatedAtUtc",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Order_Status_CreatedAtUtc",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Order_StatusTerminal_UpdatedAt",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Order_UserId_CreatedAtUtc",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "FilePurgedAtUtc",
                table: "PaymentProofs");
        }
    }
}
