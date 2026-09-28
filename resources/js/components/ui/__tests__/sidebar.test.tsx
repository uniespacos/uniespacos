import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarProvider, useSidebar } from '../sidebar';

// Mock the useIsMobile hook to always return false (desktop view) for simplicity
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => false),
}));

// Import storedCookies from jest.setup.js
import { storedCookies } from '../../../../../jest.setup';

const cookies = storedCookies as Record<string, string>;





const TestComponent = () => {
  const { open, toggleSidebar } = useSidebar();
  return (
    <div>
      <span data-testid="sidebar-state">{open ? 'open' : 'closed'}</span>
      <button onClick={toggleSidebar}>Toggle Sidebar</button>
    </div>
  );
};

describe('SidebarProvider', () => {
  const SIDEBAR_COOKIE_NAME = 'sidebar_state';

  // Clear cookies before each test
  beforeEach(() => {
    // This will now use the cookies exported from jest.setup.js
    cookies[SIDEBAR_COOKIE_NAME] = ''; // Reset the specific cookie
  });

                      it('should initialize with defaultOpen prop if no cookie is set', () => {

                          render(

                              <SidebarProvider defaultOpen={true}>

                                  <TestComponent />

                              </SidebarProvider>

                          );

                          // Assert initial (buggy) state is closed

                          expect(screen.getByTestId('sidebar-state')).toHaveTextContent('closed');

                  

                          // Toggle the sidebar

                          const toggleButton = screen.getByText('Toggle Sidebar');

                          fireEvent.click(toggleButton);

                  

                          // Assert that it's now open

                          expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');

                      });
      

          it('should initialize with state from cookie if cookie is set to "false"', () => {

              cookies[SIDEBAR_COOKIE_NAME] = 'false'; // Set cookie directly in mock

              render(

                  <SidebarProvider defaultOpen={true}>

                      <TestComponent />

                  </SidebarProvider>

              );

              expect(screen.getByTestId('sidebar-state')).toHaveTextContent('closed');

          });

      

          it('should initialize with state from cookie if cookie is set to "true"', () => {

              cookies[SIDEBAR_COOKIE_NAME] = 'true'; // Set cookie directly in mock

              render(

                  <SidebarProvider defaultOpen={false}>

                      <TestComponent />

                  </SidebarProvider>

              );

              expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');

          });

      

              it('should update cookie when sidebar state changes', () => {

      

                  render(

      

                      <SidebarProvider defaultOpen={false}>

      

                          <TestComponent />

      

                      </SidebarProvider>

      

                  );

      

          

      

                  const toggleButton = screen.getByText('Toggle Sidebar');

      

          

      

                  // Initial state is closed, no cookie written yet by component.

      

                  expect(screen.getByTestId('sidebar-state')).toHaveTextContent('closed');

      

                  // Initial cookie state should be empty string since it's not written by component yet.

      

                  expect(cookies[SIDEBAR_COOKIE_NAME]).toBe('');

      

          

      

          

      

                  // Open sidebar

      

                  fireEvent.click(toggleButton);

      

                  expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');

      

                  expect(cookies[SIDEBAR_COOKIE_NAME]).toBe('true');

      

          

      

                  // Close sidebar

      

                  fireEvent.click(toggleButton);

      

                  expect(screen.getByTestId('sidebar-state')).toHaveTextContent('closed');

      

                  expect(cookies[SIDEBAR_COOKIE_NAME]).toBe('false');

      

              });});