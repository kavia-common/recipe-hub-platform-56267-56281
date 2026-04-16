import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders header navigation", () => {
  render(<App />);
  expect(screen.getByText(/Recipe Hub/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Meal Planner/i })).toBeInTheDocument();
});
