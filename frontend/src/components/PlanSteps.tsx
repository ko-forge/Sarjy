import type { TripPlan } from "../types"

const PLAN_ORDER = ["destination", "when", "pace", "done"] as const

export function PlanSteps({ plan }: { plan: TripPlan }) {
  const current = PLAN_ORDER.indexOf(plan.step)
  const steps = [
    { id: "destination", label: plan.destination ? shortPlace(plan.destination) : "Where" },
    { id: "when", label: plan.when || "When" },
    { id: "pace", label: plan.pace || "Pace" },
  ]
  return (
    <ol className="plan-steps">
      {steps.map((step, index) => {
        const state = plan.step === "done" || index < current ? "done" : index === current ? "now" : ""
        return (
          <li key={step.id} className={state}>
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}

function shortPlace(label: string): string {
  return label.split(",")[0] || label
}
