using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Flagsweep.Infrastructure.Migrations
{
    public partial class RemoveAwsSupport : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM Deployments WHERE ProjectId IN (SELECT Id FROM Projects WHERE ConnectionId IN (SELECT Id FROM Connections WHERE ProviderType = 'AWS'))");
            migrationBuilder.Sql("DELETE FROM Environments WHERE ProjectId IN (SELECT Id FROM Projects WHERE ConnectionId IN (SELECT Id FROM Connections WHERE ProviderType = 'AWS'))");
            migrationBuilder.Sql("DELETE FROM ConfigurationProfiles WHERE ProjectId IN (SELECT Id FROM Projects WHERE ConnectionId IN (SELECT Id FROM Connections WHERE ProviderType = 'AWS'))");
            migrationBuilder.Sql("DELETE FROM Projects WHERE ConnectionId IN (SELECT Id FROM Connections WHERE ProviderType = 'AWS')");
            migrationBuilder.Sql("DELETE FROM Connections WHERE ProviderType = 'AWS'");

            migrationBuilder.DropTable(
                name: "ProfileVersions");

            migrationBuilder.DropColumn(
                name: "ProviderDeploymentNumber",
                table: "Deployments");

            migrationBuilder.DropColumn(
                name: "ProviderEnvironmentId",
                table: "Deployments");

            migrationBuilder.DropColumn(
                name: "ProviderProfileId",
                table: "Deployments");

            migrationBuilder.DropColumn(
                name: "ProviderVersion",
                table: "Deployments");

            migrationBuilder.DropColumn(
                name: "StrategyId",
                table: "Deployments");

            migrationBuilder.DropColumn(
                name: "StrategyName",
                table: "Deployments");

            migrationBuilder.DropColumn(
                name: "ProviderMetadata",
                table: "Connections");

            migrationBuilder.DropColumn(
                name: "ProviderProfileId",
                table: "ConfigurationProfiles");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
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

            migrationBuilder.AddColumn<string>(
                name: "ProviderProfileId",
                table: "Deployments",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderVersion",
                table: "Deployments",
                type: "TEXT",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StrategyId",
                table: "Deployments",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StrategyName",
                table: "Deployments",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderMetadata",
                table: "Connections",
                type: "TEXT",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderProfileId",
                table: "ConfigurationProfiles",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProfileVersions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedById = table.Column<string>(type: "TEXT", maxLength: 450, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    ProviderProfileId = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    VersionNumber = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileVersions_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProfileVersions_ProjectId_ProviderProfileId_VersionNumber",
                table: "ProfileVersions",
                columns: new[] { "ProjectId", "ProviderProfileId", "VersionNumber" },
                unique: true);
        }
    }
}
