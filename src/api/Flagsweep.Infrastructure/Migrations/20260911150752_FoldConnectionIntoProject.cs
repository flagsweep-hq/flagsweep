using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Flagsweep.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FoldConnectionIntoProject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ConnectionString",
                table: "Projects",
                type: "TEXT",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Endpoint",
                table: "Projects",
                type: "TEXT",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ProviderType",
                table: "Projects",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            // Carry each project's credentials over from its connection. The endpoint lives inside
            // the encrypted connection string and can't be read in SQL, so existing rows get a
            // unique placeholder until an admin replaces the connection string in project settings.
            migrationBuilder.Sql(
                """
                UPDATE Projects SET
                    ConnectionString = COALESCE((SELECT c.ConnectionString FROM Connections c WHERE c.Id = Projects.ConnectionId), ''),
                    ProviderType = COALESCE((SELECT c.ProviderType FROM Connections c WHERE c.Id = Projects.ConnectionId), 'Azure'),
                    Endpoint = 'legacy:' || Id;
                """
            );

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Connections_ConnectionId",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Projects_ConnectionId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ConnectionId",
                table: "Projects");

            // The Connections table is dropped in the next migration: EF runs the SQLite rebuild of
            // Projects (which removes the foreign key) after everything else in this one.
            migrationBuilder.CreateIndex(
                name: "IX_Projects_Endpoint",
                table: "Projects",
                column: "Endpoint",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ConnectionId",
                table: "Projects",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            // Give each project its own connection again, reusing the project id as the key.
            migrationBuilder.Sql(
                """
                INSERT INTO Connections (Id, Name, ProviderType, ConnectionString, CreatedAt)
                SELECT Id, Name, ProviderType, ConnectionString, CreatedAt FROM Projects;
                UPDATE Projects SET ConnectionId = Id;
                """
            );

            migrationBuilder.DropIndex(
                name: "IX_Projects_Endpoint",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ConnectionString",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Endpoint",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ProviderType",
                table: "Projects");


            migrationBuilder.CreateIndex(
                name: "IX_Projects_ConnectionId",
                table: "Projects",
                column: "ConnectionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Connections_ConnectionId",
                table: "Projects",
                column: "ConnectionId",
                principalTable: "Connections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
