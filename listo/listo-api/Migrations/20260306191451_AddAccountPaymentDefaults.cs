using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountPaymentDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "DefaultBankAccountSysId",
                table: "accounts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "DefaultPaymentMethodSysId",
                table: "accounts",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_accounts_DefaultBankAccountSysId",
                table: "accounts",
                column: "DefaultBankAccountSysId");

            migrationBuilder.CreateIndex(
                name: "IX_accounts_DefaultPaymentMethodSysId",
                table: "accounts",
                column: "DefaultPaymentMethodSysId");

            migrationBuilder.AddForeignKey(
                name: "FK_accounts_bank_accounts_DefaultBankAccountSysId",
                table: "accounts",
                column: "DefaultBankAccountSysId",
                principalTable: "bank_accounts",
                principalColumn: "sys_id");

            migrationBuilder.AddForeignKey(
                name: "FK_accounts_payment_methods_DefaultPaymentMethodSysId",
                table: "accounts",
                column: "DefaultPaymentMethodSysId",
                principalTable: "payment_methods",
                principalColumn: "sys_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_accounts_bank_accounts_DefaultBankAccountSysId",
                table: "accounts");

            migrationBuilder.DropForeignKey(
                name: "FK_accounts_payment_methods_DefaultPaymentMethodSysId",
                table: "accounts");

            migrationBuilder.DropIndex(
                name: "IX_accounts_DefaultBankAccountSysId",
                table: "accounts");

            migrationBuilder.DropIndex(
                name: "IX_accounts_DefaultPaymentMethodSysId",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "DefaultBankAccountSysId",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "DefaultPaymentMethodSysId",
                table: "accounts");
        }
    }
}
