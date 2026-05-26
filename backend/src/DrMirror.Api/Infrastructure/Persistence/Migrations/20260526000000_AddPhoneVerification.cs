using System;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DrMirror.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260526000000_AddPhoneVerification")]
    public partial class AddPhoneVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[dbo].[PhoneVerificationOtps]', N'U') IS NOT NULL
                   AND (
                       COL_LENGTH(N'[dbo].[PhoneVerificationOtps]', N'CodeHash') IS NOT NULL
                       OR EXISTS (
                           SELECT 1
                           FROM INFORMATION_SCHEMA.COLUMNS
                           WHERE TABLE_SCHEMA = N'dbo'
                             AND TABLE_NAME = N'PhoneVerificationOtps'
                             AND COLUMN_NAME = N'Purpose'
                             AND DATA_TYPE <> N'nvarchar'
                       )
                   )
                BEGIN
                    DROP TABLE [dbo].[PhoneVerificationOtps];
                END;

                IF OBJECT_ID(N'[dbo].[PhoneVerificationOtps]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[PhoneVerificationOtps] (
                        [Id] uniqueidentifier NOT NULL,
                        [UserId] uniqueidentifier NOT NULL,
                        [Code] nvarchar(6) NOT NULL,
                        [Phone] nvarchar(30) NOT NULL,
                        [Purpose] nvarchar(20) NOT NULL,
                        [ExpiresAt] datetimeoffset NOT NULL,
                        [UsedAt] datetimeoffset NULL,
                        [AttemptCount] int NOT NULL,
                        [CreatedAt] datetimeoffset NOT NULL,
                        CONSTRAINT [PK_PhoneVerificationOtps] PRIMARY KEY ([Id])
                    );
                END;

                IF COL_LENGTH(N'[dbo].[PhoneVerificationOtps]', N'Code') IS NULL
                    ALTER TABLE [dbo].[PhoneVerificationOtps] ADD [Code] nvarchar(6) NOT NULL CONSTRAINT [DF_PhoneVerificationOtps_Code] DEFAULT N'';

                IF COL_LENGTH(N'[dbo].[PhoneVerificationOtps]', N'Phone') IS NULL
                    ALTER TABLE [dbo].[PhoneVerificationOtps] ADD [Phone] nvarchar(30) NOT NULL CONSTRAINT [DF_PhoneVerificationOtps_Phone] DEFAULT N'';

                IF COL_LENGTH(N'[dbo].[PhoneVerificationOtps]', N'UsedAt') IS NULL
                    ALTER TABLE [dbo].[PhoneVerificationOtps] ADD [UsedAt] datetimeoffset NULL;

                IF COL_LENGTH(N'[dbo].[PhoneVerificationOtps]', N'AttemptCount') IS NULL
                    ALTER TABLE [dbo].[PhoneVerificationOtps] ADD [AttemptCount] int NOT NULL CONSTRAINT [DF_PhoneVerificationOtps_AttemptCount] DEFAULT 0;

                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE [name] = N'IX_PhoneVerificationOtps_UserId_ExpiresAt'
                      AND [object_id] = OBJECT_ID(N'[dbo].[PhoneVerificationOtps]')
                )
                    CREATE INDEX [IX_PhoneVerificationOtps_UserId_ExpiresAt]
                    ON [dbo].[PhoneVerificationOtps] ([UserId], [ExpiresAt]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PhoneVerificationOtps");
        }
    }
}
