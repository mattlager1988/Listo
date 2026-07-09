using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScratchNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "scratch_notes",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    content = table.Column<string>(type: "text", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_converted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    converted_date = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    converted_task_sys_id = table.Column<long>(type: "bigint", nullable: true),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scratch_notes", x => x.sys_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "scratch_notes");
        }
    }
}
