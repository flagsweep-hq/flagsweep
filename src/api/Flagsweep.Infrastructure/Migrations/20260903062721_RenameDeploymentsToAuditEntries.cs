using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Flagsweep.Infrastructure.Migrations
{
    public partial class RenameDeploymentsToAuditEntries : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(name: "Deployments", newName: "AuditEntries");
            migrationBuilder.RenameIndex(
                name: "IX_Deployments_EnvironmentId",
                table: "AuditEntries",
                newName: "IX_AuditEntries_EnvironmentId");
            migrationBuilder.RenameIndex(
                name: "IX_Deployments_ProjectId_EnvironmentId_CreatedAt",
                table: "AuditEntries",
                newName: "IX_AuditEntries_ProjectId_EnvironmentId_CreatedAt");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(name: "AuditEntries", newName: "Deployments");
            migrationBuilder.RenameIndex(
                name: "IX_AuditEntries_EnvironmentId",
                table: "Deployments",
                newName: "IX_Deployments_EnvironmentId");
            migrationBuilder.RenameIndex(
                name: "IX_AuditEntries_ProjectId_EnvironmentId_CreatedAt",
                table: "Deployments",
                newName: "IX_Deployments_ProjectId_EnvironmentId_CreatedAt");
        }
    }
}
