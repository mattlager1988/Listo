using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPeriodLogEntriesAndTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "mood",
                table: "period_logs");

            migrationBuilder.DropColumn(
                name: "pain_severity",
                table: "period_logs");

            migrationBuilder.AddColumn<bool>(
                name: "is_start_date_estimated",
                table: "period_logs",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "pre_week_start_date",
                table: "period_logs",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "period_log_entry_types",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_deleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_period_log_entry_types", x => x.sys_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "period_log_entries",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    period_log_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    entry_type_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    entry_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_period_log_entries", x => x.sys_id);
                    table.ForeignKey(
                        name: "FK_period_log_entries_period_log_entry_types_entry_type_sys_id",
                        column: x => x.entry_type_sys_id,
                        principalTable: "period_log_entry_types",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_period_log_entries_period_logs_period_log_sys_id",
                        column: x => x.period_log_sys_id,
                        principalTable: "period_logs",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_period_log_entries_entry_type_sys_id",
                table: "period_log_entries",
                column: "entry_type_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_period_log_entries_period_log_sys_id",
                table: "period_log_entries",
                column: "period_log_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_period_log_entry_types_name",
                table: "period_log_entry_types",
                column: "name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "period_log_entries");

            migrationBuilder.DropTable(
                name: "period_log_entry_types");

            migrationBuilder.DropColumn(
                name: "is_start_date_estimated",
                table: "period_logs");

            migrationBuilder.DropColumn(
                name: "pre_week_start_date",
                table: "period_logs");

            migrationBuilder.AddColumn<int>(
                name: "mood",
                table: "period_logs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "pain_severity",
                table: "period_logs",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
