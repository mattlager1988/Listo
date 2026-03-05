using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDiscontinuedFieldsFromHardDeleteEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiscontinuedDate",
                table: "training_logs");

            migrationBuilder.DropColumn(
                name: "IsDiscontinued",
                table: "training_logs");

            migrationBuilder.DropColumn(
                name: "DiscontinuedDate",
                table: "notes");

            migrationBuilder.DropColumn(
                name: "IsDiscontinued",
                table: "notes");

            migrationBuilder.DropColumn(
                name: "DiscontinuedDate",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "IsDiscontinued",
                table: "documents");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DiscontinuedDate",
                table: "training_logs",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDiscontinued",
                table: "training_logs",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DiscontinuedDate",
                table: "notes",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDiscontinued",
                table: "notes",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DiscontinuedDate",
                table: "documents",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDiscontinued",
                table: "documents",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }
    }
}
