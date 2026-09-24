Feature: Connection Settings
  As an admin
  I want to manage a connection's environments after creation
  So that the connection keeps matching how we deploy

  Scenario: Add a custom environment
    Given the connection "Azure App" with environments "Development and Production"
    And I am signed in as an admin
    When I open the "Settings" page of "Azure App" from the sidebar
    And I add a custom environment "Staging" with label "staging" in settings
    Then I should see "Staging" in the sidebar

  Scenario: Rename an environment
    Given the connection "Azure App" with environments "Development, Staging and Production"
    And I am signed in as an admin
    When I open the "Settings" page of "Azure App" from the sidebar
    And I rename the environment "Staging" to "QA"
    Then I should see "QA" in the sidebar
    And I should not see "Staging" in the sidebar

  Scenario: Delete an environment
    Given the connection "Azure App" with environments "Development, Staging and Production"
    And I am signed in as an admin
    When I open the "Settings" page of "Azure App" from the sidebar
    And I delete the environment "Staging"
    Then I should not see "Staging" in the sidebar

  Scenario: Test the connection
    Given the connection "Azure App" with environments "Development and Production"
    And I am signed in as an admin
    When I open the "Settings" page of "Azure App" from the sidebar
    And I click "Test connection"
    Then I should see "Connected successfully"

  Scenario: Replace the connection string
    Given the connection "Azure App" with environments "Development and Production"
    And I am signed in as an admin
    When I open the "Settings" page of "Azure App" from the sidebar
    And I replace the connection string with a new secret for store "fake.azconfig.io"
    Then I should see "Connection string updated."
    And I should see "https://fake.azconfig.io"
