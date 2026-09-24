Feature: Member Access
  As a member
  I should only see and reach the parts of Flagsweep my role allows
  So that admin-only functions stay protected

  Scenario: Members do not get admin navigation
    Given I am signed in as a member
    Then I should see "Dashboard" in the sidebar
    And I should not see "Users" in the sidebar

  Scenario: Members cannot open user management
    Given I am signed in as a member
    When I open the users page
    Then I should see "Access Denied"

  Scenario: Members cannot edit connection settings
    Given the connection "Azure App" with environments "Development and Production"
    And I am signed in as a member
    When I navigate to the "Settings" page of connection "Azure App"
    Then I should see "Only admins can edit connection settings."

  Scenario: Members cannot create connections
    Given I am signed in as a member
    When I open the new connection page
    Then I should see "Only admins can create connections."
