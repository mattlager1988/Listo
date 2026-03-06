using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCycleTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "cycle_transactions",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    cycle_plan_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    amount_in = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    amount_out = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    transaction_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cycle_transactions", x => x.sys_id);
                    table.ForeignKey(
                        name: "FK_cycle_transactions_cycle_plans_cycle_plan_sys_id",
                        column: x => x.cycle_plan_sys_id,
                        principalTable: "cycle_plans",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_cycle_transactions_cycle_plan_sys_id",
                table: "cycle_transactions",
                column: "cycle_plan_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_cycle_transactions_transaction_date",
                table: "cycle_transactions",
                column: "transaction_date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cycle_transactions");
        }
    }
}
