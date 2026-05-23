using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class M5b_PreparingAtAndCodRepair : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'PreparingAt')
                  BEGIN
                    ALTER TABLE [Orders] ADD [PreparingAt] datetimeoffset NULL;
                  END");

            migrationBuilder.Sql(
                @"UPDATE PaymentMethods SET Kind = 0 WHERE Code = 'cod' AND Kind <> 0;");

            migrationBuilder.Sql(
                @"UPDATE Orders
                  SET PaymentMethodKind = 0
                  WHERE PaymentMethodId IN (SELECT Id FROM PaymentMethods WHERE Code = 'cod')
                    AND PaymentMethodKind <> 0;");

            migrationBuilder.Sql(
                @"UPDATE Orders
                  SET Status = 1,
                      ConfirmedAt = COALESCE(ConfirmedAt, CreatedAt),
                      UpdatedAt = SYSUTCDATETIME()
                  WHERE PaymentMethodKind = 0
                    AND Status = 0
                    AND NOT EXISTS (
                      SELECT 1 FROM PaymentProofs WHERE PaymentProofs.OrderId = Orders.Id
                    );");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'PreparingAt')
                  BEGIN
                    ALTER TABLE [Orders] DROP COLUMN [PreparingAt];
                  END");
        }
    }
}
