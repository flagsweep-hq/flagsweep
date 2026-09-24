Feature: Environment Protection
  As an admin
  I want to protect sensitive environments
  So that only admins can change flags there

  Background:
    Given the connection "Azure App" with environments "Development and Production"

  Scenario: Admin protects the Production environment
    Given I am signed in as an admin
    When I open the "Settings" page of "Azure App" from the sidebar
    And I turn on protection for "Production"
    Then the environment "Production" should be marked protected in settings
    When I am on the "Production" environment of "Azure App"
    Then I should see the "Protected" badge

  Scenario: Members cannot modify flags in a protected environment
    Given the "Production" environment is protected
    And I am signed in as a member
    And I am on the "Production" environment of "Azure App"
    Then I should see the protected environment banner
    And the "New Flag" button should be disabled

  Scenario: Members can still manage flags in unprotected environments
    Given the "Production" environment is protected
    And I am signed in as a member
    And I am on the "Development" environment of "Azure App"
    When I start creating the flag "Member.Experiment"
    Then the "Production" environment should not be selectable in the dialog
    When I finish creating the flag
    Then I should see "Member.Experiment" in the flags table

  Scenario: Admins can still create flags in a protected environment
    Given the "Production" environment is protected
    And I am signed in as an admin
    And I am on the "Production" environment of "Azure App"
    When I create the flag "Checkout.NewFlow"
    Then I should see "Checkout.NewFlow" in the flags table
