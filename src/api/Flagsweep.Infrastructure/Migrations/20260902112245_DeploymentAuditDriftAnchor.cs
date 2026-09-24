using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Flagsweep.Infrastructure.Migrations
{
    public partial class DeploymentAuditDriftAnchor : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Deployments");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "Deployments");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ProviderTimestamp",
                table: "Deployments",
                type: "TEXT",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProviderTimestamp",
                table: "Deployments");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "Deployments",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Deployments",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }
    }
}
