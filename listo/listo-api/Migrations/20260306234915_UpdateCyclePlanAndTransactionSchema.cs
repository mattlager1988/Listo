using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateCyclePlanAndTransactionSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_cycle_transactions_transaction_date",
                table: "cycle_transactions");

            migrationBuilder.DropColumn(
                name: "amount_in",
                table: "cycle_transactions");

            migrationBuilder.DropColumn(
                name: "transaction_date",
                table: "cycle_transactions");

            migrationBuilder.RenameColumn(
                name: "description",
                table: "cycle_transactions",
                newName: "notes");

            migrationBuilder.RenameColumn(
                name: "amount_out",
                table: "cycle_transactions",
                newName: "amount");

            migrationBuilder.AddColumn<string>(
                name: "name",
                table: "cycle_transactions",
                type: "varchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "amount_in",
                table: "cycle_plans",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "amount_out",
                table: "cycle_plans",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "name",
                table: "cycle_transactions");

            migrationBuilder.DropColumn(
                name: "amount_in",
                table: "cycle_plans");

            migrationBuilder.DropColumn(
                name: "amount_out",
                table: "cycle_plans");

            migrationBuilder.RenameColumn(
                name: "notes",
                table: "cycle_transactions",
                newName: "description");

            migrationBuilder.RenameColumn(
                name: "amount",
                table: "cycle_transactions",
                newName: "amount_out");

            migrationBuilder.AddColumn<decimal>(
                name: "amount_in",
                table: "cycle_transactions",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "transaction_date",
                table: "cycle_transactions",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_cycle_transactions_transaction_date",
                table: "cycle_transactions",
                column: "transaction_date");
        }
    }
}
