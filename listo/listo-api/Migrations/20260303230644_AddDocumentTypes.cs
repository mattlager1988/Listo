using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "document_type_sys_id",
                table: "documents",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "document_types",
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
                    table.PrimaryKey("PK_document_types", x => x.sys_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_documents_document_type_sys_id",
                table: "documents",
                column: "document_type_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_document_types_name",
                table: "document_types",
                column: "name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_documents_document_types_document_type_sys_id",
                table: "documents",
                column: "document_type_sys_id",
                principalTable: "document_types",
                principalColumn: "sys_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_documents_document_types_document_type_sys_id",
                table: "documents");

            migrationBuilder.DropTable(
                name: "document_types");

            migrationBuilder.DropIndex(
                name: "IX_documents_document_type_sys_id",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "document_type_sys_id",
                table: "documents");
        }
    }
}
