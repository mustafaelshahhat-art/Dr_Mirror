using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class M7_InquiryRespondedAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RespondedAt",
                table: "Inquiries",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RespondedByUserId",
                table: "Inquiries",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Inquiries_RespondedByUserId",
                table: "Inquiries",
                column: "RespondedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Inquiries_Users_RespondedByUserId",
                table: "Inquiries",
                column: "RespondedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Inquiries_Users_RespondedByUserId",
                table: "Inquiries");

            migrationBuilder.DropIndex(
                name: "IX_Inquiries_RespondedByUserId",
                table: "Inquiries");

            migrationBuilder.DropColumn(
                name: "RespondedAt",
                table: "Inquiries");

            migrationBuilder.DropColumn(
                name: "RespondedByUserId",
                table: "Inquiries");
        }
    }
}
