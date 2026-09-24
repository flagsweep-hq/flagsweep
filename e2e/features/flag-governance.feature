Feature: Flag Governance
  As an admin
  I want to edit, lock, and assign ownership of flags
  So that flags stay accountable and safe to operate

  Background:
    Given the connection "Azure App" with environments "Development and Production"

  Scenario: A new flag starts disabled
    Given I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I create the flag "Checkout.NewFlow"
    Then I should see "Checkout.NewFlow" in the flags table
    And the "Checkout.NewFlow" flag should show "Disabled"

  Scenario: Edit a flag's name and description
    Given the flag "Checkout.NewFlow" exists in "Development"
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I open the edit dialog for "Checkout.NewFlow"
    And I fill in "Name" with "New Checkout Flow" in the dialog
    And I fill in "Description" with "Rolls out the redesigned checkout" in the dialog
    And I save the dialog
    Then I should see "New Checkout Flow" in the flags table
    And I should see "Rolls out the redesigned checkout" in the flags table

  Scenario: Mark a flag as permanent
    Given the flag "Checkout.NewFlow" exists in "Development"
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I open the edit dialog for "Checkout.NewFlow"
    And I turn on "Permanent flag" in the dialog
    And I save the dialog
    Then the "Checkout.NewFlow" flag should show retire-by "Never"

  Scenario: Lock a flag in the store
    Given the flag "Checkout.NewFlow" exists in "Development"
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I lock the flag "Checkout.NewFlow"
    Then the "Checkout.NewFlow" flag should be locked

  Scenario: Unlock a flag in the store
    Given the flag "Checkout.NewFlow" exists in "Development"
    And the flag "Checkout.NewFlow" is locked in "Development"
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I unlock the flag "Checkout.NewFlow"
    Then the "Checkout.NewFlow" flag should not be locked

  Scenario: Assign a flag owner
    Given the flag "Checkout.NewFlow" exists in "Development"
    And a member exists
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I assign "member@test.com" as the owner of "Checkout.NewFlow"
    Then the "Checkout.NewFlow" flag should show owner "member"

  Scenario: Owned flags appear on the owner's dashboard
    Given the flag "Checkout.NewFlow" named "New Checkout Flow" exists in "Development"
    And the flag "Checkout.NewFlow" is owned by the member
    And I am signed in as a member
    Then I should see "My Flags"
    And I should see "New Checkout Flow"

  Scenario: Reassign the owner from the edit dialog
    Given the flag "Checkout.NewFlow" exists in "Development"
    And the flag "Checkout.NewFlow" is owned by the member
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    When I open the edit dialog for "Checkout.NewFlow"
    And I assign "admin@test.com" as the owner in the dialog
    And I save the dialog
    Then the "Checkout.NewFlow" flag should show owner "admin"
