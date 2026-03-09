using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountCardImageBlobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "back_image",
                table: "account_cards",
                type: "mediumblob",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "back_image_mime_type",
                table: "account_cards",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<byte[]>(
                name: "front_image",
                table: "account_cards",
                type: "mediumblob",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "front_image_mime_type",
                table: "account_cards",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "back_image",
                table: "account_cards");

            migrationBuilder.DropColumn(
                name: "back_image_mime_type",
                table: "account_cards");

            migrationBuilder.DropColumn(
                name: "front_image",
                table: "account_cards");

            migrationBuilder.DropColumn(
                name: "front_image_mime_type",
                table: "account_cards");
        }
    }
}
