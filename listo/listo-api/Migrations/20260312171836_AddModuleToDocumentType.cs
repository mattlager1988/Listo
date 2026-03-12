using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddModuleToDocumentType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_document_types_name",
                table: "document_types");

            migrationBuilder.AddColumn<string>(
                name: "module",
                table: "document_types",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql("UPDATE document_types SET module = 'aviation' WHERE module = ''");

            migrationBuilder.CreateIndex(
                name: "IX_document_types_name_module",
                table: "document_types",
                columns: new[] { "name", "module" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_document_types_name_module",
                table: "document_types");

            migrationBuilder.DropColumn(
                name: "module",
                table: "document_types");

            migrationBuilder.CreateIndex(
                name: "IX_document_types_name",
                table: "document_types",
                column: "name",
                unique: true);
        }
    }
}
