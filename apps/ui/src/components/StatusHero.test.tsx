import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusHero } from "./StatusHero.js";

describe("StatusHero", () => {
  it("uses accurate indexing copy and exposes progress accessibly", () => {
    const { container } = render(<StatusHero status={{ state: "indexing", version: "0.9.12", coreHeight: 101, indexedHeight: 100, percent: 99.01, message: "Indexing Litecoin blocks" }} />);

    expect(screen.getByRole("status")).toHaveAccessibleName("Electrs is indexing");
    expect(screen.getByText("Indexing Litecoin blocks")).toBeInTheDocument();
    expect(screen.queryByText("Synchronized")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "99.01");
    expect(container.querySelectorAll(".is-indexed")).toHaveLength(5);
  });
});
