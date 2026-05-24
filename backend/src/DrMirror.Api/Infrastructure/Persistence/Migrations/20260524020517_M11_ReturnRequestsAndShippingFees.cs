using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class M11_ReturnRequestsAndShippingFees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShippingGovernorateNameAr",
                table: "Orders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingGovernorateNameEn",
                table: "Orders",
                type: "varchar(100)",
                unicode: false,
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GovernorateShippingFees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    Slug = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    NameEn = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Fee = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    LastUpdatedByAdminId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GovernorateShippingFees", x => x.Id);
                    table.CheckConstraint("CK_GovernorateShippingFees_Fee_NonNegative", "[Fee] >= 0");
                    table.ForeignKey(
                        name: "FK_GovernorateShippingFees_Users_LastUpdatedByAdminId",
                        column: x => x.LastUpdatedByAdminId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReturnRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BuyerUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CustomerReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    AdminNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReviewedByAdminId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CancelledAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReturnRequests_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReturnRequests_Users_BuyerUserId",
                        column: x => x.BuyerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReturnRequests_Users_ReviewedByAdminId",
                        column: x => x.ReviewedByAdminId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReturnRequestItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    ReturnRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductVariantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NameEn = table.Column<string>(type: "varchar(200)", unicode: false, maxLength: 200, nullable: false),
                    Sku = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    Size = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    ColorName = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    ColorNameAr = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ColorHex = table.Column<string>(type: "varchar(7)", unicode: false, maxLength: 7, nullable: false),
                    PrimaryImageUrl = table.Column<string>(type: "varchar(500)", unicode: false, maxLength: 500, nullable: true),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnRequestItems", x => x.Id);
                    table.CheckConstraint("CK_ReturnRequestItems_Quantity_Positive", "[Quantity] > 0");
                    table.ForeignKey(
                        name: "FK_ReturnRequestItems_OrderItems_OrderItemId",
                        column: x => x.OrderItemId,
                        principalTable: "OrderItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReturnRequestItems_ProductVariants_ProductVariantId",
                        column: x => x.ProductVariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReturnRequestItems_ReturnRequests_ReturnRequestId",
                        column: x => x.ReturnRequestId,
                        principalTable: "ReturnRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            foreach (var governorate in Governorates)
            {
                migrationBuilder.Sql($"""
                    IF NOT EXISTS (SELECT 1 FROM [GovernorateShippingFees] WHERE [Slug] = '{EscapeSql(governorate.Slug)}')
                    BEGIN
                        INSERT INTO [GovernorateShippingFees] ([Slug], [NameEn], [NameAr], [Fee], [IsActive], [UpdatedAt])
                        VALUES ('{EscapeSql(governorate.Slug)}', '{EscapeSql(governorate.NameEn)}', N'{EscapeSql(governorate.NameAr)}', 0.00, 1, SYSUTCDATETIME())
                    END
                    """);
            }

            migrationBuilder.CreateIndex(
                name: "IX_GovernorateShippingFees_IsActive",
                table: "GovernorateShippingFees",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_GovernorateShippingFees_LastUpdatedByAdminId",
                table: "GovernorateShippingFees",
                column: "LastUpdatedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_GovernorateShippingFees_Slug",
                table: "GovernorateShippingFees",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequestItems_OrderItemId",
                table: "ReturnRequestItems",
                column: "OrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequestItems_ProductVariantId",
                table: "ReturnRequestItems",
                column: "ProductVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequestItems_ReturnRequestId",
                table: "ReturnRequestItems",
                column: "ReturnRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_BuyerUserId_Status",
                table: "ReturnRequests",
                columns: new[] { "BuyerUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_ReviewedByAdminId",
                table: "ReturnRequests",
                column: "ReviewedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_Status_CreatedAt",
                table: "ReturnRequests",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "UQ_ReturnRequests_ActivePerOrder",
                table: "ReturnRequests",
                column: "OrderId",
                unique: true,
                filter: "[Status] IN (1, 2, 4)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GovernorateShippingFees");

            migrationBuilder.DropTable(
                name: "ReturnRequestItems");

            migrationBuilder.DropTable(
                name: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "ShippingGovernorateNameAr",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippingGovernorateNameEn",
                table: "Orders");
        }

        private static readonly (string Slug, string NameEn, string NameAr)[] Governorates = new[]
        {
            ("alexandria", "Alexandria", "الإسكندرية"),
            ("aswan", "Aswan", "أسوان"),
            ("asyut", "Asyut", "أسيوط"),
            ("beheira", "Beheira", "البحيرة"),
            ("beni-suef", "Beni Suef", "بني سويف"),
            ("cairo", "Cairo", "القاهرة"),
            ("dakahlia", "Dakahlia", "الدقهلية"),
            ("damietta", "Damietta", "دمياط"),
            ("faiyum", "Faiyum", "الفيوم"),
            ("gharbia", "Gharbia", "الغربية"),
            ("giza", "Giza", "الجيزة"),
            ("ismailia", "Ismailia", "الإسماعيلية"),
            ("kafr-el-sheikh", "Kafr el-Sheikh", "كفر الشيخ"),
            ("luxor", "Luxor", "الأقصر"),
            ("matruh", "Matruh", "مطروح"),
            ("minya", "Minya", "المنيا"),
            ("monufia", "Monufia", "المنوفية"),
            ("new-valley", "New Valley", "الوادي الجديد"),
            ("north-sinai", "North Sinai", "شمال سيناء"),
            ("port-said", "Port Said", "بورسعيد"),
            ("qalyubia", "Qalyubia", "القليوبية"),
            ("qena", "Qena", "قنا"),
            ("red-sea", "Red Sea", "البحر الأحمر"),
            ("sharqia", "Sharqia", "الشرقية"),
            ("sohag", "Sohag", "سوهاج"),
            ("south-sinai", "South Sinai", "جنوب سيناء"),
            ("suez", "Suez", "السويس"),
        };

        private static string EscapeSql(string value) => value.Replace("'", "''");
    }
}
