Feature: Feature Flags
  As an admin
  I want to manage feature flags
  So that I can control application behavior

  Background:
    Given the connection "Azure App" with environments "Development and Production"

  Scenario: Create a flag with dots in ID
    Given I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I create the flag "App.DarkMode"
    Then I should see "App.DarkMode" in the flags table

  Scenario: Toggle a flag on
    Given the flag "App.DarkMode" exists in "Development"
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I toggle "App.DarkMode"
    And I confirm the toggle
    Then the "App.DarkMode" flag should show "Enabled"

  Scenario: Delete a flag
    Given the flag "App.DarkMode" exists in "Development"
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I delete the flag "App.DarkMode"
    Then I should not see "App.DarkMode" in the flags table

  Scenario: Create a flag in several environments at once
    Given I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I start creating the flag "Shared.Banner"
    And I select the "Production" environment in the dialog
    And I finish creating the flag
    Then I should see "Shared.Banner" in the flags table
    When I am on the "Production" environment of "Azure App"
    Then I should see "Shared.Banner" in the flags table
