using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLksemEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "account_owners",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_account_owners", x => x.sys_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "account_types",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_account_types", x => x.sys_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "accounts",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    account_type_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    account_owner_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    amount_due = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    due_date = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    account_number = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    phone_number = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    web_address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    username = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    encrypted_password = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    auto_pay = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    reset_amount_due = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    account_flag = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accounts", x => x.sys_id);
                    table.ForeignKey(
                        name: "FK_accounts_account_owners_account_owner_sys_id",
                        column: x => x.account_owner_sys_id,
                        principalTable: "account_owners",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_accounts_account_types_account_type_sys_id",
                        column: x => x.account_type_sys_id,
                        principalTable: "account_types",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_account_owners_name",
                table: "account_owners",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_account_types_name",
                table: "account_types",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_accounts_account_owner_sys_id",
                table: "accounts",
                column: "account_owner_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_accounts_account_type_sys_id",
                table: "accounts",
                column: "account_type_sys_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "accounts");

            migrationBuilder.DropTable(
                name: "account_owners");

            migrationBuilder.DropTable(
                name: "account_types");
        }
    }
}
