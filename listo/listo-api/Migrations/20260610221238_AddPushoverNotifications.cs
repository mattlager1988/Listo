using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPushoverNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "pushover_key",
                table: "users",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<long>(
                name: "last_notified_message_sys_id",
                table: "conversation_participants",
                type: "bigint",
                nullable: true);

            // Seed Pushover settings (notifications are enabled once a token is set).
            var now = DateTime.UtcNow;
            migrationBuilder.InsertData(
                table: "settings",
                columns: new[] { "key", "value", "category", "display_name", "description", "value_type", "is_sensitive", "sort_order", "create_timestamp", "modify_timestamp" },
                values: new object[] { "Pushover:ApiToken", null, "Pushover", "Application Token", "Pushover application token. Set this to enable unread-message notifications; clear it to disable.", "string", true, 1, now, now });

            migrationBuilder.InsertData(
                table: "settings",
                columns: new[] { "key", "value", "category", "display_name", "description", "value_type", "is_sensitive", "sort_order", "create_timestamp", "modify_timestamp" },
                values: new object[] { "Pushover:UnreadMinutes", "15", "Pushover", "Unread Minutes", "Notify when a message has been unread for this many minutes.", "int", false, 2, now, now });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(table: "settings", keyColumn: "key", keyValue: "Pushover:ApiToken");
            migrationBuilder.DeleteData(table: "settings", keyColumn: "key", keyValue: "Pushover:UnreadMinutes");

            migrationBuilder.DropColumn(
                name: "pushover_key",
                table: "users");

            migrationBuilder.DropColumn(
                name: "last_notified_message_sys_id",
                table: "conversation_participants");
        }
    }
}
