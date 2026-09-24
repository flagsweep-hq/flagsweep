Feature: Connection Setup
  As an admin
  I want to connect a flag store as a connection with environments
  So that I can organize my feature flags

  Scenario: Create an Azure connection with environments
    Given I am signed in as an admin
    When I open the new connection page
    And I connect the store "fake.azconfig.io"
    And I fill in the connection name with "Azure App"
    And I click "Next"
    And I add a custom environment named "Development" with label "dev"
    And I add a custom environment named "Production" with label "prod"
    And I click "Create connection"
    Then I should see "Azure App" in the sidebar

  Scenario: Cannot connect the same store twice
    Given the connection "Azure App" with environments "Development"
    And I am signed in as an admin
    When I open the new connection page
    And I enter the connection string for store "fake.azconfig.io"
    And I click "Connect"
    Then I should see "This store is already connected as 'Azure App'."

  Scenario: Cannot add duplicate environment
    Given I am signed in as an admin
    When I open the new connection page
    And I connect the store "other.azconfig.io"
    And I fill in the connection name with "Dup Env Test"
    And I click "Next"
    And I add a custom environment named "Development"
    And I try to add a custom environment named "Development" again
    Then I should see "Environment \"Development\" already exists."
