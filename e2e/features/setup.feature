Feature: Initial Admin Setup
  As a new Flagsweep user
  I want to create the first admin account
  So that I can start managing feature flags

  @fresh-install
  Scenario: Fresh instance redirects to setup page
    When I open the application
    Then I should be on the setup page
    And I should see "Create the first admin account"

  @fresh-install
  Scenario: Passwords must match
    When I open the setup page
    And I enter the admin account details with a password confirmation that does not match
    And I click "Create Account"
    Then I should see "Passwords do not match"

  @fresh-install
  Scenario: Create admin account successfully
    When I open the setup page
    And I enter the admin account details
    And I click "Create Account"
    Then I should be on the dashboard

  Scenario: Setup is only available once
    When I open the setup page
    Then I should be on the login page
