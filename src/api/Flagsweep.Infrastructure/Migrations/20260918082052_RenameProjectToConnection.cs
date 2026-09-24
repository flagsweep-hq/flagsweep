using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Flagsweep.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameProjectToConnection : Migration
    {
        // Renames in place so existing rows survive; the scaffolded version dropped Projects and
        // created an empty Connections. SQLite re-points the child tables' foreign keys itself
        // when the parent is renamed. Constraint names (PK_Projects, FK_*_Projects_*) keep their
        // old spelling until the next table rebuild, which is harmless: SQLite never looks them up.

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(name: "Projects", newName: "Connections");

            migrationBuilder.RenameIndex(
                name: "IX_Projects_Endpoint",
                table: "Connections",
                newName: "IX_Connections_Endpoint"
            );

            migrationBuilder.RenameColumn(name: "ProjectId", table: "FlagOwners", newName: "ConnectionId");

            migrationBuilder.RenameIndex(name: "IX_FlagOwners_ProjectId_FlagId", table: "FlagOwners", newName: "IX_FlagOwners_ConnectionId_FlagId");

            migrationBuilder.RenameColumn(name: "ProjectId", table: "Environments", newName: "ConnectionId");

            migrationBuilder.RenameIndex(name: "IX_Environments_ProjectId_Name", table: "Environments", newName: "IX_Environments_ConnectionId_Name");

            migrationBuilder.RenameColumn(name: "ProjectId", table: "AuditEntries", newName: "ConnectionId");

            migrationBuilder.RenameIndex(name: "IX_AuditEntries_ProjectId_EnvironmentId_CreatedAt", table: "AuditEntries", newName: "IX_AuditEntries_ConnectionId_EnvironmentId_CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(name: "Connections", newName: "Projects");

            migrationBuilder.RenameIndex(
                name: "IX_Connections_Endpoint",
                table: "Projects",
                newName: "IX_Projects_Endpoint"
            );

            migrationBuilder.RenameColumn(name: "ConnectionId", table: "FlagOwners", newName: "ProjectId");

            migrationBuilder.RenameIndex(name: "IX_FlagOwners_ConnectionId_FlagId", table: "FlagOwners", newName: "IX_FlagOwners_ProjectId_FlagId");

            migrationBuilder.RenameColumn(name: "ConnectionId", table: "Environments", newName: "ProjectId");

            migrationBuilder.RenameIndex(name: "IX_Environments_ConnectionId_Name", table: "Environments", newName: "IX_Environments_ProjectId_Name");

            migrationBuilder.RenameColumn(name: "ConnectionId", table: "AuditEntries", newName: "ProjectId");

            migrationBuilder.RenameIndex(name: "IX_AuditEntries_ConnectionId_EnvironmentId_CreatedAt", table: "AuditEntries", newName: "IX_AuditEntries_ProjectId_EnvironmentId_CreatedAt");
        }
    }
}
