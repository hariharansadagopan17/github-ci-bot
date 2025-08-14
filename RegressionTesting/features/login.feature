Feature: User Authentication
  As a user
  I want to be able to login to the application
  So that I can access my account

  Background:
    Given I navigate to the login page

  @smoke @login
  Scenario: Successful login with valid credentials
    When I enter valid username and password
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see a welcome message

  @smoke @login
  Scenario: Failed login with invalid credentials
    When I enter invalid username and password
    And I click the login button
    Then I should see an error message
    And I should remain on the login page

  @login
  Scenario: Failed login with empty credentials
    When I leave username and password fields empty
    And I click the login button
    Then I should see validation error messages
    And I should remain on the login page

  @login
  Scenario: Logout functionality
    Given I am logged in with valid credentials
    When I click the logout button
    Then I should be redirected to the login page
    And I should not be able to access protected pages

  @login
  Scenario: Remember me functionality
    When I enter valid username and password
    And I check the "Remember me" checkbox
    And I click the login button
    Then I should be redirected to the dashboard
    When I close and reopen the browser
    And I navigate to the application
    Then I should still be logged in
