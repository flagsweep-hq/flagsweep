using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Flagsweep.Infrastructure.Migrations
{
    public partial class AddDeploymentAwsTracking : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProviderDeploymentNumber",
                table: "Deployments",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderEnvironmentId",
                table: "Deployments",
                type: "TEXT",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProviderDeploymentNumber",
                table: "Deployments");

            migrationBuilder.DropColumn(
                name: "ProviderEnvironmentId",
                table: "Deployments");
        }
    }
}
