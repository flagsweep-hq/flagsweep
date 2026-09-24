Feature: Login
  As a registered user
  I want to sign in to Flagsweep
  So that I can manage feature flags

  Scenario: Sign in with valid credentials
    When I sign in as an admin
    Then I should be on the dashboard
    And I should see "Welcome to Flagsweep"

  Scenario: Sign in with a wrong password
    When I sign in as an admin with the wrong password
    Then I should see "Invalid email or password."
    And I should still be on the login page
