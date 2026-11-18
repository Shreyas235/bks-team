import { collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useQueryRows } from "./useCol";

export * from "./stats";

// Daily updates between two dates (inclusive), with loading + error state.
export const useRangeState = (a, b, enabled = true) =>
  useQueryRows(() => query(collection(db, "updates"), where("date", ">=", a), where("date", "<=", b)), [a, b], enabled);
export const useRange = (a, b) => useRangeState(a, b).rows;
