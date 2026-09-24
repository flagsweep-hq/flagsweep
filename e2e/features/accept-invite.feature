Feature: Accept Invitation
  As an invited team member
  I want to accept my invite link and set a password
  So that I can sign in to Flagsweep

  Scenario: Invited member sets a password and lands on the dashboard
    Given the member has been invited
    And I am signed in as an admin
    When I open the invite link for "member@test.com"
    Then I should see "Accept Invitation"
    When I set my password
    Then I should be on the dashboard

  Scenario: A used invite link is no longer valid
    Given the member has been invited
    And I am signed in as an admin
    When I open the invite link for "member@test.com"
    And I set my password
    Then I should be on the dashboard
    When I open the last invite link again
    Then I should see "Invalid Invitation"

  Scenario: A member can sign in with their password
    Given a member exists
    When I sign in as a member
    Then I should be on the dashboard
