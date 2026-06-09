using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMessaging : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "conversations",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    name = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conversations", x => x.sys_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "conversation_participants",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    conversation_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    user_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    last_read_message_sys_id = table.Column<long>(type: "bigint", nullable: true),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conversation_participants", x => x.sys_id);
                    table.ForeignKey(
                        name: "FK_conversation_participants_conversations_conversation_sys_id",
                        column: x => x.conversation_sys_id,
                        principalTable: "conversations",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_conversation_participants_users_user_sys_id",
                        column: x => x.user_sys_id,
                        principalTable: "users",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "messages",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    conversation_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    sender_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    body = table.Column<string>(type: "text", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_messages", x => x.sys_id);
                    table.ForeignKey(
                        name: "FK_messages_conversations_conversation_sys_id",
                        column: x => x.conversation_sys_id,
                        principalTable: "conversations",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_messages_users_sender_sys_id",
                        column: x => x.sender_sys_id,
                        principalTable: "users",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "message_attachments",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    message_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    file_name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    original_file_name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    mime_type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    file_size = table.Column<long>(type: "bigint", nullable: false),
                    storage_path = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    kind = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_message_attachments", x => x.sys_id);
                    table.ForeignKey(
                        name: "FK_message_attachments_messages_message_sys_id",
                        column: x => x.message_sys_id,
                        principalTable: "messages",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "message_reactions",
                columns: table => new
                {
                    sys_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    message_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    user_sys_id = table.Column<long>(type: "bigint", nullable: false),
                    emoji = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    create_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    modify_timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    create_user = table.Column<long>(type: "bigint", nullable: true),
                    modify_user = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_message_reactions", x => x.sys_id);
                    table.ForeignKey(
                        name: "FK_message_reactions_messages_message_sys_id",
                        column: x => x.message_sys_id,
                        principalTable: "messages",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_message_reactions_users_user_sys_id",
                        column: x => x.user_sys_id,
                        principalTable: "users",
                        principalColumn: "sys_id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_conversation_participants_conversation_sys_id_user_sys_id",
                table: "conversation_participants",
                columns: new[] { "conversation_sys_id", "user_sys_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_conversation_participants_user_sys_id",
                table: "conversation_participants",
                column: "user_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_message_attachments_message_sys_id",
                table: "message_attachments",
                column: "message_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_message_reactions_message_sys_id_user_sys_id_emoji",
                table: "message_reactions",
                columns: new[] { "message_sys_id", "user_sys_id", "emoji" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_message_reactions_user_sys_id",
                table: "message_reactions",
                column: "user_sys_id");

            migrationBuilder.CreateIndex(
                name: "IX_messages_conversation_sys_id_sys_id",
                table: "messages",
                columns: new[] { "conversation_sys_id", "sys_id" });

            migrationBuilder.CreateIndex(
                name: "IX_messages_sender_sys_id",
                table: "messages",
                column: "sender_sys_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "conversation_participants");

            migrationBuilder.DropTable(
                name: "message_attachments");

            migrationBuilder.DropTable(
                name: "message_reactions");

            migrationBuilder.DropTable(
                name: "messages");

            migrationBuilder.DropTable(
                name: "conversations");
        }
    }
}
