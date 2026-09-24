Feature: User Management
  As an admin
  I want to invite and manage users
  So that my team can access Flagsweep

  Scenario: Invite a new user
    Given I am signed in as an admin
    When I open the users page
    And I click "Invite User"
    And I fill in "Email" with "member@test.com" in the dialog
    And I click "Create Invite Link"
    Then I should see an invite link for "member@test.com"

  Scenario: Cannot invite the same email twice
    Given the member has been invited
    And I am signed in as an admin
    When I open the users page
    And I click "Invite User"
    And I fill in "Email" with "member@test.com" in the dialog
    And I click "Create Invite Link"
    Then I should see "An active invitation already exists for this email."

  Scenario: Cannot invite an existing user
    Given I am signed in as an admin
    When I open the users page
    And I click "Invite User"
    And I fill in "Email" with "admin@test.com" in the dialog
    And I click "Create Invite Link"
    Then I should see "A user with this email already exists."
