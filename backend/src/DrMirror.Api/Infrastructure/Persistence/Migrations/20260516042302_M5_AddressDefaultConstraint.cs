using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class M5_AddressDefaultConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Normalize any pre-existing duplicate-default rows before adding the constraint.
            // For each user with more than one IsDefault=1 address, keep only the most
            // recently updated one. Safe to run when no rows exist.
            migrationBuilder.Sql(@"
                WITH ranked AS (
                    SELECT Id,
                           ROW_NUMBER() OVER (
                               PARTITION BY UserId
                               ORDER BY UpdatedAt DESC, Id DESC
                           ) AS rn
                    FROM BuyerAddresses
                    WHERE IsDefault = 1
                )
                UPDATE BuyerAddresses
                SET IsDefault = 0
                WHERE Id IN (SELECT Id FROM ranked WHERE rn > 1);
            ");

            migrationBuilder.CreateIndex(
                name: "IX_BuyerAddresses_UserId_UniqueDefault",
                table: "BuyerAddresses",
                column: "UserId",
                unique: true,
                filter: "[IsDefault] = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BuyerAddresses_UserId_UniqueDefault",
                table: "BuyerAddresses");
        }
    }
}
