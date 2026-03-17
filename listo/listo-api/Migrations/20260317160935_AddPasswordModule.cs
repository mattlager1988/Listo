using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "password_categories",
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
                    table.PrimaryKey("PK_password_categories", x => x.sys_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "password_entries",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    title = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    url = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    encrypted_username = table.Column<string>(type: "text", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    encrypted_password = table.Column<string>(type: "text", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    encrypted_notes = table.Column<string>(type: "text", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_favorite = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    category_sys_id = table.Column<long>(type: "bigint", nullable: true),
                    user_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_password_entries", x => x.sys_id);
                    table.ForeignKey(
                        name: "FK_password_entries_password_categories_category_sys_id",
                        column: x => x.category_sys_id,
                        principalTable: "password_categories",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_password_entries_users_user_sys_id",
                        column: x => x.user_sys_id,
                        principalTable: "users",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_password_categories_name",
                table: "password_categories",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_password_entries_category_sys_id",
                table: "password_entries",
                column: "category_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_password_entries_user_sys_id",
                table: "password_entries",
                column: "user_sys_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "password_entries");

            migrationBuilder.DropTable(
                name: "password_categories");
        }
    }
}
