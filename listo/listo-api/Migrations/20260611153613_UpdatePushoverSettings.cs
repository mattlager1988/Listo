using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePushoverSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Generic description (notifications are used across Listo, not just messaging).
            migrationBuilder.UpdateData(
                table: "settings",
                keyColumn: "key",
                keyValue: "Pushover:ApiToken",
                columns: new[] { "display_name", "description" },
                values: new object[]
                {
                    "Application Token",
                    "Pushover application API token used to send Listo push notifications. Set this to enable notifications; clear it to disable."
                });

            // Notifications are now sent immediately to users who aren't in the app,
            // so the unread-minutes delay is no longer used.
            migrationBuilder.DeleteData(table: "settings", keyColumn: "key", keyValue: "Pushover:UnreadMinutes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "settings",
                columns: new[] { "key", "value", "category", "display_name", "description", "value_type", "is_sensitive", "sort_order", "create_timestamp", "modify_timestamp" },
                values: new object[] { "Pushover:UnreadMinutes", "15", "Pushover", "Unread Minutes", "Notify when a message has been unread for this many minutes.", "int", false, 2, DateTime.UtcNow, DateTime.UtcNow });

            migrationBuilder.UpdateData(
                table: "settings",
                keyColumn: "key",
                keyValue: "Pushover:ApiToken",
                columns: new[] { "display_name", "description" },
                values: new object[]
                {
                    "Application Token",
                    "Pushover application token. Set this to enable unread-message notifications; clear it to disable."
                });
        }
    }
}
