Feature: Flag-First Navigation
  As a team member
  I want to see and change a flag across every environment from one place
  So that I can reason about a feature rather than an environment

  Background:
    Given the connection "Azure App" with environments "Development and Production"

  Scenario: A connection opens on its flag list
    Given the flag "Checkout.NewFlow" exists in "Development"
    And I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    Then I should see "Checkout.NewFlow" in the flag list
    And the "Checkout.NewFlow" flag should show its rollout across environments

  Scenario: Opening a flag shows every environment
    Given the flag "Checkout.NewFlow" exists in "Development"
    And I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    And I open the "Checkout.NewFlow" flag
    Then the flag detail should list the environment "Development"
    And the flag detail should list the environment "Production"

  Scenario: Changing a flag's value from its detail page
    Given the flag "Member.Experiment" exists in "Development"
    And I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    And I open the "Member.Experiment" flag
    And I switch "Member.Experiment" on in "Development" in the environment editor
    And I apply the environment changes
    Then the flag detail should show "Enabled" for "Development"

  Scenario: Toggling an environment straight from the flag list
    Given the flag "Member.Experiment" exists in "Development"
    And I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    And I click the "Development" chip on the "Member.Experiment" flag
    And I confirm the toggle
    Then the "Development" chip on the "Member.Experiment" flag should read "Enabled"
    When I click the "Development" chip on the "Member.Experiment" flag
    And I confirm the toggle
    Then the "Development" chip on the "Member.Experiment" flag should read "Disabled"

  Scenario: Adding a flag to an environment it is missing from
    Given the flag "Member.Experiment" exists in "Development"
    And I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    And I open the "Member.Experiment" flag
    And I add "Member.Experiment" to "Production" in the environment editor
    And I apply the environment changes
    Then the flag detail should show "Disabled" for "Production"

  Scenario: A member cannot change a protected environment from a flag's page
    Given the flag "Member.Experiment" exists in "Development"
    And the "Production" environment is protected
    And I am signed in as a member
    When I open the "Flags" page of "Azure App" from the sidebar
    And I open the "Member.Experiment" flag
    Then the environment editor should show "Production" as read-only

  Scenario: Creating a flag from the flag list, in chosen environments
    Given I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    And I start creating the flag "Search.Ranking"
    And I select the "Production" environment in the dialog
    And I finish creating the flag
    Then the flag detail should list the environment "Development"
    And the flag detail should list the environment "Production"
    And the flag detail should show "Disabled" for "Production"
    When I open the "Flags" page of "Azure App" from the sidebar
    Then I should see "Search.Ranking" in the flag list

  Scenario: Editing a flag's details applies to every environment
    Given the flag "Search.Ranking" exists in "Development and Production"
    And I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    And I open the "Search.Ranking" flag
    And I rename the flag to "Search Ranking v2" with description "Relevance model"
    Then the flag detail should be titled "Search Ranking v2"
    When I am on the "Development" environment of "Azure App"
    Then I should see "Search Ranking v2" in the flags table
    When I am on the "Production" environment of "Azure App"
    Then I should see "Search Ranking v2" in the flags table

  Scenario: Assigning an owner from the flag list
    Given the flag "Search.Ranking" exists in "Development and Production"
    And I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    And I assign "admin@test.com" as owner of "Search.Ranking" in the flag list
    Then the "Search.Ranking" flag should show owner "admin" in the flag list

  Scenario: Locking a flag is staged until Apply changes
    Given the flag "Search.Ranking" exists in "Development and Production"
    And I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    And I open the "Search.Ranking" flag
    And I lock the flag in "Development"
    Then the flag detail should show "1 to lock" as pending
    When I apply the environment changes
    Then the flag should be locked in "Development"
    And the flag should not be locked in "Production"
    And I should see "This flag is locked in Development"
    And the "Edit" button should be disabled
    And the "Delete" button should be disabled

  Scenario: Unlocking and changing a value in one apply
    Given the flag "Search.Ranking" exists in "Development and Production"
    And the flag "Search.Ranking" is locked in "Development"
    And I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    And I open the "Search.Ranking" flag
    And I unlock the flag in "Development"
    And I switch "Search.Ranking" on in "Development" in the environment editor
    And I apply the environment changes
    Then the flag should not be locked in "Development"
    And the flag detail should show "Enabled" for "Development"

  Scenario: Deleting a flag removes it from every environment
    Given the flag "Search.Ranking" exists in "Development and Production"
    And I am signed in as an admin
    When I open the "Flags" page of "Azure App" from the sidebar
    And I open the "Search.Ranking" flag
    And I delete the flag permanently
    Then I should not see "Search.Ranking" in the flag list
    When I am on the "Development" environment of "Azure App"
    Then I should not see "Search.Ranking" in the flags table

  Scenario: Environments are still reachable for per-environment work
    Given the flag "Checkout.NewFlow" exists in "Development"
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    Then I should see "Feature Flags"
    And I should see "Checkout.NewFlow" in the flags table
