using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Listo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentDueDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "due_date",
                table: "payments",
                type: "datetime(6)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "due_date",
                table: "payments");
        }
    }
}
