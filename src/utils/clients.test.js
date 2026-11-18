import { describe, expect, it } from "vitest";
import { buildClients, clientPayments, clientTasks } from "./clients";

const deals = [
  { clientName: "Shiva Shakthi ", projectName: "Website redesign", value: 8000 },
  { clientName: "shiva shakthi", projectName: "SEO", value: 2000 },
  { clientName: "GA Engineers", projectName: "Portal", value: 5000 },
];
describe("clients", () => {
  const cs = buildClients(deals);
  it("groups deals by client name ignoring case and spaces", () => { expect(cs).toHaveLength(2); expect(cs.find((c) => c.key === "shiva shakthi").value).toBe(10000); });
  it("links payments by client or project name", () => {
    const p = [{ project: "Shiva Shakthi Enterprises" }, { project: "x", description: "Website redesign" }, { project: "Other" }];
    expect(clientPayments(cs.find((c) => c.key === "shiva shakthi"), p)).toHaveLength(2);
  });
  it("links logged tasks and sorts newest first", () => {
    const ups = [{ date: "2026-11-01", name: "A", tasks: [{ client: "GA Engineers", hours: 1 }] }, { date: "2026-11-05", name: "B", tasks: [{ client: "ga engineers portal", hours: 2 }, { client: "zzz" }] }];
    expect(clientTasks(cs.find((c) => c.key === "ga engineers"), ups).map((t) => t.date)).toEqual(["2026-11-05", "2026-11-01"]);
  });
  it("ignores very short names", () => expect(clientPayments({ key: "ab", deals: [] }, [{ project: "ab" }])).toHaveLength(0));
});
