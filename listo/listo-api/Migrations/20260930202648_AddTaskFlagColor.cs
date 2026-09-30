using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskFlagColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "flag_color",
                table: "task_items",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "flag_color",
                table: "task_items");
        }
    }
}
