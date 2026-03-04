using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "settings",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    key = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    value = table.Column<string>(type: "text", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    category = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    display_name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    value_type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_sensitive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settings", x => x.sys_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_settings_key",
                table: "settings",
                column: "key",
                unique: true);

            // Seed initial settings
            var now = DateTime.UtcNow;

            // OpenAI settings
            migrationBuilder.InsertData(
                table: "settings",
                columns: new[] { "key", "value", "category", "display_name", "description", "value_type", "is_sensitive", "sort_order", "create_timestamp", "modify_timestamp" },
                values: new object[] { "OpenAI:ApiKey", null, "OpenAI", "API Key", "Your OpenAI API key for AI-powered features", "string", true, 1, now, now });

            migrationBuilder.InsertData(
                table: "settings",
                columns: new[] { "key", "value", "category", "display_name", "description", "value_type", "is_sensitive", "sort_order", "create_timestamp", "modify_timestamp" },
                values: new object[] { "OpenAI:Model", "gpt-4o", "OpenAI", "Model", "The OpenAI model to use (e.g., gpt-4o, gpt-4-turbo)", "string", false, 2, now, now });

            // Document Storage settings
            migrationBuilder.InsertData(
                table: "settings",
                columns: new[] { "key", "value", "category", "display_name", "description", "value_type", "is_sensitive", "sort_order", "create_timestamp", "modify_timestamp" },
                values: new object[] { "DocumentStorage:BasePath", "./uploads", "Document Storage", "Base Path", "Directory path where uploaded documents are stored", "string", false, 1, now, now });

            migrationBuilder.InsertData(
                table: "settings",
                columns: new[] { "key", "value", "category", "display_name", "description", "value_type", "is_sensitive", "sort_order", "create_timestamp", "modify_timestamp" },
                values: new object[] { "DocumentStorage:MaxFileSizeMB", "250", "Document Storage", "Max File Size (MB)", "Maximum allowed file size for uploads in megabytes", "int", false, 2, now, now });

            migrationBuilder.InsertData(
                table: "settings",
                columns: new[] { "key", "value", "category", "display_name", "description", "value_type", "is_sensitive", "sort_order", "create_timestamp", "modify_timestamp" },
                values: new object[] { "DocumentStorage:AllowedExtensions", ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt", "Document Storage", "Allowed Extensions", "Comma-separated list of allowed file extensions", "string", false, 3, now, now });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "settings");
        }
    }
}
