import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PlanSteps } from "./PlanSteps"
import type { TripPlan } from "../types"

function plan(partial: Partial<TripPlan>): TripPlan {
  return {
    active: true,
    step: "destination",
    destination: "",
    when: "",
    pace: "",
    ...partial,
  }
}

describe("PlanSteps", () => {
  it("marks the current step and shortens the place", () => {
    render(<PlanSteps plan={plan({ step: "when", destination: "Kyoto, Japan" })} />)

    expect(screen.getByText("Kyoto").className).toBe("done")
    expect(screen.getByText("When").className).toBe("now")
    expect(screen.getByText("Pace").className).toBe("")
  })

  it("marks every step done when the plan is finished", () => {
    render(
      <PlanSteps
        plan={plan({
          active: false,
          step: "done",
          destination: "Lisboa, Portugal",
          when: "next week",
          pace: "relaxed",
        })}
      />,
    )

    expect(screen.getByText("Lisboa").className).toBe("done")
    expect(screen.getByText("next week").className).toBe("done")
    expect(screen.getByText("relaxed").className).toBe("done")
  })
})
