using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_modules",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    user_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    module_key = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_modules", x => x.sys_id);
                    table.ForeignKey(
                        name: "FK_user_modules_users_user_sys_id",
                        column: x => x.user_sys_id,
                        principalTable: "users",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_user_modules_user_sys_id_module_key",
                table: "user_modules",
                columns: new[] { "user_sys_id", "module_key" },
                unique: true);

            // Grandfather existing users into all assignable modules so no one
            // loses access on deploy. New users start with only what the admin grants.
            migrationBuilder.Sql(@"
                INSERT INTO user_modules (user_sys_id, module_key, create_timestamp, modify_timestamp)
                SELECT u.sys_id, m.k, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
                FROM users u
                CROSS JOIN (
                    SELECT 'dashboard' AS k
                    UNION ALL SELECT 'finance'
                    UNION ALL SELECT 'aviation'
                    UNION ALL SELECT 'passwords'
                    UNION ALL SELECT 'tasks'
                    UNION ALL SELECT 'messaging'
                ) m;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_modules");
        }
    }
}
