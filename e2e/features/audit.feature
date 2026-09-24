Feature: Audit Trail
  As an admin
  I want every flag change attributed to a person
  So that I know who changed what and when

  Background:
    Given the connection "Azure App" with environments "Development and Production"

  Scenario: Toggling a flag records who did it
    Given the flag "Checkout.NewFlow" exists in "Development"
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I toggle "Checkout.NewFlow"
    And I confirm the toggle
    Then the "Checkout.NewFlow" flag should show "Enabled"
    When I open the "Audit" page of "Azure App" from the sidebar
    Then the latest audit entry should show "Checkout.NewFlow" changed "enabled" from "false" to "true" by "admin@test.com"

  Scenario: Member actions are attributed to the member
    Given the member created the flag "Member.Experiment" in "Development"
    And I am signed in as an admin
    When I open the "Audit" page of "Azure App" from the sidebar
    Then the audit log should contain an entry for "Member.Experiment" by "member@test.com"
