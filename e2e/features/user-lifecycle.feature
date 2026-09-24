Feature: User Lifecycle
  As an admin
  I want to change roles, deactivate and restore users
  So that access follows people as the team changes

  Scenario: Promote a member to admin and back
    Given a member exists
    And I am signed in as an admin
    When I open the users page
    And I change the role of "member@test.com" to "Admin"
    Then "member@test.com" should have the role "Admin"
    When I change the role of "member@test.com" to "Member"
    Then "member@test.com" should have the role "Member"

  Scenario: Delete a user
    Given a member exists
    And I am signed in as an admin
    When I open the users page
    And I delete the user "member@test.com"
    Then "member@test.com" should be listed as a deleted user

  Scenario: A deleted user can no longer sign in
    Given the member has been deleted
    When I sign in as a member
    Then I should see "Invalid email or password."
    And I should still be on the login page

  Scenario: Flags owned by a deleted user say so
    Given the connection "Azure App" with environments "Development and Production"
    And the flag "Checkout.NewFlow" exists in "Development"
    And the flag "Checkout.NewFlow" is owned by the member
    And the member has been deleted
    And I am signed in as an admin
    And I am on the "Development" environment of "Azure App"
    Then the "Checkout.NewFlow" flag should show owner "Deleted user"

  Scenario: Restore a user by re-inviting them
    Given the member has been deleted
    And I am signed in as an admin
    When I open the users page
    And I restore the user "member@test.com"
    Then I should see an invite link for "member@test.com"
    When I click "Done"
    And I open the invite link for "member@test.com"
    And I set my password
    Then I should be on the dashboard

  Scenario: A restored user keeps their identity and flag ownership
    Given the connection "Azure App" with environments "Development and Production"
    And the flag "Checkout.NewFlow" exists in "Development"
    And the flag "Checkout.NewFlow" is owned by the member
    And the member has been deleted
    And I am signed in as an admin
    When I open the users page
    And I restore the user "member@test.com"
    And I click "Done"
    And I open the invite link for "member@test.com"
    And I set my password
    Then I should be on the dashboard
    When I am signed in as an admin
    And I open the users page
    Then "member@test.com" should be listed as an active user
    When I am on the "Development" environment of "Azure App"
    Then the "Checkout.NewFlow" flag should show owner "member"
