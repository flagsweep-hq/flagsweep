Feature: Flag Retirement
  As an admin
  I want flags with a past retire-by date to stand out
  So that stale flags get cleaned up

  Background:
    Given the connection "Azure App" with environments "Development and Production"

  Scenario: A flag past its retire-by date is marked overdue
    Given I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I start creating the flag "Legacy.Banner"
    And I fill in "Retire-by date" with "2020-01-01" in the dialog
    And I finish creating the flag
    Then I should see "Legacy.Banner" in the flags table
    And the "Legacy.Banner" flag should show retire-by "Jan 1, 2020"
    And the "Legacy.Banner" flag should be overdue for retirement

  Scenario: Overdue flags show on the dashboard
    Given the flag "Legacy.Banner" exists in "Development" with retire-by date "2020-01-01"
    And I am signed in as an admin
    Then I should see "Needs Retirement"
    And I should see "Legacy.Banner"
