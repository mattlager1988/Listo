using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBankAccountsAndLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "bank_account_sys_id",
                table: "payments",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "bank_accounts",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    account_number = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    routing_number = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    balance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    is_discontinued = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    discontinued_date = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bank_accounts", x => x.sys_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ledger_transactions",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    bank_account_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    transaction_type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    payment_sys_id = table.Column<long>(type: "bigint", nullable: true),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ledger_transactions", x => x.sys_id);
                    table.ForeignKey(
                        name: "FK_ledger_transactions_bank_accounts_bank_account_sys_id",
                        column: x => x.bank_account_sys_id,
                        principalTable: "bank_accounts",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ledger_transactions_payments_payment_sys_id",
                        column: x => x.payment_sys_id,
                        principalTable: "payments",
                        principalColumn: "sys_id");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_payments_bank_account_sys_id",
                table: "payments",
                column: "bank_account_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_ledger_transactions_bank_account_sys_id",
                table: "ledger_transactions",
                column: "bank_account_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_ledger_transactions_payment_sys_id",
                table: "ledger_transactions",
                column: "payment_sys_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_bank_accounts_bank_account_sys_id",
                table: "payments",
                column: "bank_account_sys_id",
                principalTable: "bank_accounts",
                principalColumn: "sys_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_payments_bank_accounts_bank_account_sys_id",
                table: "payments");

            migrationBuilder.DropTable(
                name: "ledger_transactions");

            migrationBuilder.DropTable(
                name: "bank_accounts");

            migrationBuilder.DropIndex(
                name: "IX_payments_bank_account_sys_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "bank_account_sys_id",
                table: "payments");
        }
    }
}
